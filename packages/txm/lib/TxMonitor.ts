import { bigIntMax, bigIntReplacer, promiseWithResolvers, unknownToError } from "@happy.tech/common"
import { SpanStatusCode, context, trace } from "@opentelemetry/api"
import { type Result, ResultAsync, err, ok } from "neverthrow"
import { type GetTransactionReceiptErrorType, type TransactionReceipt, TransactionReceiptNotFoundError } from "viem"
import type { LatestBlock } from "./BlockMonitor.js"
import { Topics, eventBus } from "./EventBus.js"
import type { RevertedTransactionReceipt } from "./RetryPolicyManager"
import { type Attempt, AttemptType, type Transaction, TransactionStatus } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"
import { TxmMetrics } from "./telemetry/metrics"
import { TraceMethod } from "./telemetry/traces"
import { logger } from "./utils/logger"

type AttemptWithReceipt = { attempt: Attempt; receipt: TransactionReceipt }

/**
 * This module is responsible for monitoring in-flight transactions. It handles scenarios where a transaction completes successfully, fails, or becomes stuck.
 * This module requests all receipts for all attempts made on a transaction.
 * All the checked attempts share the same nonce, so only one of them could have been executed, and the expected response for the rest will always be "no receipt found."
 * For this reason, we consider different scenarios based on the responses received from the requests:
 *
 * - The RPC responds to all requests, but all are in the "no receipt found" state. In this case, we act as if the transaction is stuck
 * due to insufficient gas price and initiate a new attempt with gas priced at the current market rate and sufficient
 * gas to overwrite the last attempt.
 *
 * - The RPC responds that one of the attempts has been executed. In this case, we act accordingly depending on whether
 * the execution was successful or failed. If the successfully executed attempt was a transaction execution attempt,
 * the transaction transitions to the {@link TransactionStatus.Success} state. If the successfully executed attempt was a cancellation attempt,
 * the transaction moves to the {@link TransactionStatus.Cancelled} state. If the executed attempt failed, the transaction is moved to the {@link TransactionStatus.Failed} state
 * unless the retry policy class indicates that the transaction should be retried. In that case, the transaction is retried with a new nonce and continues to be in {@link TransactionStatus.Pending} state.
 *
 * - If the execution receipt is not received and at least one of the RPC queries does not respond. In that case, we do nothing,
 * as it is possible that the unanswered RPC query corresponds to a transaction that has been executed, which could lead to potential issues.
 */
export class TxMonitor {
    private readonly transactionManager: TransactionManager
    private locked = false
    private pendingBlockPromises: PromiseWithResolvers<void>[] = []

    constructor(transactionManager: TransactionManager) {
        this.transactionManager = transactionManager
        eventBus.on(Topics.NewBlock, this.onNewBlock.bind(this))
    }

    @TraceMethod("txm.tx-monitor.on-new-block")
    private async onNewBlock(block: LatestBlock) {
        const span = trace.getSpan(context.active())!

        span.addEvent("txm.tx-monitor.on-new-block.started", {
            blockNumber: Number(block.number),
        })

        if (this.locked) {
            span.addEvent("txm.tx-monitor.on-new-block.locked")
            const pending = promiseWithResolvers<void>()
            this.pendingBlockPromises.push(pending)
            try {
                await pending.promise
                span.addEvent("txm.tx-monitor.on-new-block.lock-resolved")
            } catch {
                // A more recent block came while we were waiting, abort.
                span.addEvent("txm.tx-monitor.on-new-block.lock-aborted")
                return
            }
        }

        this.locked = true
        try {
            await this.handleNewBlock(block)
        } catch (error) {
            span.recordException(unknownToError(error))
            span.setStatus({ code: SpanStatusCode.ERROR })
            logger.error("Error in handleNewBlock: ", error)
        }
        this.locked = false

        this.pendingBlockPromises.pop()?.resolve()
        this.pendingBlockPromises.forEach((p) => p.reject())
    }

    @TraceMethod("txm.tx-monitor.handle-new-block")
    private async handleNewBlock(block: LatestBlock) {
        const span = trace.getSpan(context.active())!
        const txRepository = this.transactionManager.transactionRepository

        span.addEvent("txm.tx-monitor.handle-new-block.started", {
            blockNumber: Number(block.number),
        })

        if (!this.transactionManager.rpcLivenessMonitor.isAlive) {
            span.addEvent("txm.tx-monitor.handle-new-block.rpc-not-alive")
            span.setStatus({ code: SpanStatusCode.ERROR })
            logger.warn("RPC is not alive, skipping attempt to monitor transactions")
            return
        }

        const transactions = txRepository.getInFlightTransactionsOlderThan(block.number)

        for (const transaction of transactions) {
            span.addEvent("txm.tx-monitor.handle-new-block.monitoring-transaction", {
                transactionIntentId: transaction.intentId,
            })
        }

        const promises = transactions.map(async (transaction) => {
            const inAirAttempts = transaction.getInAirAttempts()

            span.addEvent("txm.tx-monitor.handle-new-block.monitoring-transaction.in-air-attempts", {
                transactionIntentId: transaction.intentId,
                inAirAttempts: JSON.stringify(inAirAttempts, bigIntReplacer),
            })

            // This could happen if, on the first try, the attempt to submit the transaction fails before flush
            if (inAirAttempts.length === 0) {
                return this.handleNotAttemptedTransaction(transaction, block)
            }

            let isResolved = false
            const { promise: receiptPromise, resolve, reject: _reject } = promiseWithResolvers<AttemptWithReceipt>()

            /**
             *   We request receipts for all attempts in parallel. Since only one attempt can have a receipt due to all of them sharing the same nonce,
             *   we can terminate the process as soon as a receipt is obtained. This is why we use a {@link Promise.race}
             *   between a promise that resolves on the receipt and all individual promises that resolve when
             *   the call returns (with {@link TransactionReceiptNotFoundError}).
             */
            const promises: Promise<Result<AttemptWithReceipt | null, GetTransactionReceiptErrorType>>[] =
                inAirAttempts.map(
                    async (attempt): Promise<Result<AttemptWithReceipt | null, GetTransactionReceiptErrorType>> => {
                        const receiptResult = await this.transactionManager.viemClient.safeGetTransactionReceipt({
                            hash: attempt.hash,
                        })

                        if (receiptResult.isOk()) {
                            const attemptWithReceipt = { attempt, receipt: receiptResult.value }
                            if (!isResolved) {
                                isResolved = true
                                resolve(attemptWithReceipt)
                            }
                            this.transactionManager.rpcLivenessMonitor.trackSuccess()
                            return ok(attemptWithReceipt)
                        }
                        if (receiptResult.error instanceof TransactionReceiptNotFoundError) {
                            this.transactionManager.rpcLivenessMonitor.trackSuccess()
                            return ok(null)
                        }

                        this.transactionManager.rpcLivenessMonitor.trackError()
                        return err(receiptResult.error)
                    },
                )
            const attemptOrResults = await Promise.race([receiptPromise, Promise.all(promises)])

            if (Array.isArray(attemptOrResults)) {
                span.addEvent("txm.tx-monitor.handle-new-block.monitoring-transaction.array-of-results", {
                    transactionIntentId: transaction.intentId,
                    attemptOrResults: JSON.stringify(attemptOrResults, bigIntReplacer),
                })

                /*
                    If there are any errors, then we should return because there is a risk 
                    that the transaction was executed and we don’t know
                */
                if (attemptOrResults.some((v) => v.isErr())) {
                    const description = `Failed to get transaction receipt for transaction ${transaction.intentId}`
                    span.recordException(new Error(description))
                    span.setStatus({ code: SpanStatusCode.ERROR })
                    logger.error(description)
                    return
                }

                const nonce = transaction.lastAttempt?.nonce

                if (nonce === undefined) {
                    const description = `Transaction ${transaction.intentId} inconsistent state: no nonce found`
                    span.recordException(new Error(description))
                    span.setStatus({ code: SpanStatusCode.ERROR })
                    logger.error(description)
                    return
                }

                if (nonce <= this.transactionManager.nonceManager.maxExecutedNonce) {
                    transaction.changeStatus(TransactionStatus.Interrupted)
                    return
                }

                return await (transaction.isExpired(block, this.transactionManager.blockTime)
                    ? this.handleExpiredTransaction(transaction)
                    : this.handleStuckTransaction(transaction))
            }

            const { attempt, receipt } = attemptOrResults

            span.addEvent("txm.tx-monitor.handle-new-block.monitoring-transaction.receipt-received", {
                transactionIntentId: transaction.intentId,
                receipt: JSON.stringify(receipt, bigIntReplacer),
            })

            TxmMetrics.getInstance().transactionInclusionBlockHistogram.record(
                Number(block.number - transaction.collectionBlock!),
            )

            if (receipt.status === "success") {
                if (attempt.type === AttemptType.Cancellation) {
                    logger.error(`Transaction ${transaction.intentId} was cancelled`)
                    return transaction.changeStatus(TransactionStatus.Cancelled)
                }
                return transaction.changeStatus(TransactionStatus.Success)
            }

            const shouldRetry = await this.transactionManager.retryPolicyManager.shouldRetry(
                this.transactionManager,
                transaction,
                attempt,
                receipt as RevertedTransactionReceipt,
            )

            if (!shouldRetry) {
                logger.error(`Transaction ${transaction.intentId} failed`)
                return transaction.changeStatus(TransactionStatus.Failed)
            }

            TxmMetrics.getInstance().transactionsRetriedCounter.add(1)

            return this.handleRetryTransaction(transaction)
        })

        await Promise.all(promises)

        const result = await ResultAsync.fromPromise(txRepository.saveTransactions(transactions), unknownToError)

        if (result.isErr()) {
            logger.error("Error flushing transactions in onNewBlock")
        }
    }

    @TraceMethod("txm.tx-monitor.calc-replacement-fee")
    private calcReplacementFee(
        maxFeePerGas: bigint,
        maxPriorityFeePerGas: bigint,
    ): {
        replacementMaxFeePerGas: bigint
        replacementMaxPriorityFeePerGas: bigint
    } {
        const { maxFeePerGas: marketMaxFeePerGas, maxPriorityFeePerGas: marketMaxPriorityFeePerGas } =
            this.transactionManager.gasPriceOracle.suggestGasForNextBlock()

        const replacementMaxFeePerGas = (maxFeePerGas * 110n) / 100n
        const replacementMaxPriorityFeePerGas = (maxPriorityFeePerGas * 110n) / 100n

        return {
            replacementMaxFeePerGas: bigIntMax(replacementMaxFeePerGas, marketMaxFeePerGas),
            replacementMaxPriorityFeePerGas: bigIntMax(replacementMaxPriorityFeePerGas, marketMaxPriorityFeePerGas),
        }
    }

    @TraceMethod("txm.tx-monitor.should-emit-new-attempt")
    private shouldEmitNewAttempt(attempt: Attempt): boolean {
        const { expectedNextBaseFeePerGas, targetPriorityFee } = this.transactionManager.gasPriceOracle

        return (
            attempt.maxPriorityFeePerGas < targetPriorityFee ||
            attempt.maxFeePerGas - attempt.maxPriorityFeePerGas < expectedNextBaseFeePerGas
        )
    }

    @TraceMethod("txm.tx-monitor.handle-expired-transaction")
    private async handleExpiredTransaction(transaction: Transaction): Promise<void> {
        const span = trace.getSpan(context.active())!

        const attempt = transaction.lastAttempt

        if (!attempt) {
            const description = `Transaction ${transaction.intentId} inconsistent state: no attempt found in handleExpiredTransaction`
            span.recordException(new Error(description))
            span.setStatus({ code: SpanStatusCode.ERROR })
            logger.error(description)
            return
        }

        const { replacementMaxFeePerGas, replacementMaxPriorityFeePerGas } = this.calcReplacementFee(
            attempt.maxFeePerGas,
            attempt.maxPriorityFeePerGas,
        )

        span.addEvent("txm.tx-monitor.handle-expired-transaction.attempting-submission", {
            transactionIntentId: transaction.intentId,
            nonce: attempt.nonce,
            maxFeePerGas: Number(replacementMaxFeePerGas),
            maxPriorityFeePerGas: Number(replacementMaxPriorityFeePerGas),
        })

        transaction.changeStatus(TransactionStatus.Cancelling)

        const submissionResult = await this.transactionManager.transactionSubmitter.submitNewAttempt(transaction, {
            type: AttemptType.Cancellation,
            nonce: attempt.nonce,
            maxFeePerGas: replacementMaxFeePerGas,
            maxPriorityFeePerGas: replacementMaxPriorityFeePerGas,
        })

        if (submissionResult.isErr()) {
            span.recordException(unknownToError(submissionResult.error))
            span.setStatus({ code: SpanStatusCode.ERROR })
        }
    }

    @TraceMethod("txm.tx-monitor.handle-stuck-transaction")
    private async handleStuckTransaction(transaction: Transaction): Promise<void> {
        const span = trace.getSpan(context.active())!

        const attempt = transaction.lastAttempt

        if (!attempt) {
            const description = `Transaction ${transaction.intentId} inconsistent state: no attempt found in handleStuckTransaction`
            span.recordException(new Error(description))
            span.setStatus({ code: SpanStatusCode.ERROR })
            logger.error(description)
            return
        }

        if (!this.shouldEmitNewAttempt(attempt)) {
            logger.info(
                `Transaction ${transaction.intentId} is stuck, but the gas price is still sufficient for current network conditions. Sending same attempt again.`,
            )
            const result = await this.transactionManager.transactionSubmitter.resubmitAttempt(transaction, attempt)
            if (result.isErr()) {
                span.recordException(unknownToError(result.error))
                span.setStatus({ code: SpanStatusCode.ERROR })
            }
            return
        }

        logger.info(
            `Transaction ${transaction.intentId} is stuck and the gas price is below optimal network parameters. Sending new attempt.`,
        )

        const { replacementMaxFeePerGas, replacementMaxPriorityFeePerGas } = this.calcReplacementFee(
            attempt.maxFeePerGas,
            attempt.maxPriorityFeePerGas,
        )

        span.addEvent("txm.tx-monitor.handle-stuck-transaction.attempting-submission", {
            transactionIntentId: transaction.intentId,
            nonce: attempt.nonce,
            maxFeePerGas: Number(replacementMaxFeePerGas),
            maxPriorityFeePerGas: Number(replacementMaxPriorityFeePerGas),
        })

        const submissionResult = await this.transactionManager.transactionSubmitter.submitNewAttempt(transaction, {
            type: AttemptType.Original,
            nonce: attempt.nonce,
            maxFeePerGas: replacementMaxFeePerGas,
            maxPriorityFeePerGas: replacementMaxPriorityFeePerGas,
        })

        if (submissionResult.isErr()) {
            span.recordException(unknownToError(submissionResult.error))
            span.setStatus({ code: SpanStatusCode.ERROR })
        }
    }

    @TraceMethod("txm.tx-monitor.handle-not-attempted-transaction")
    private async handleNotAttemptedTransaction(transaction: Transaction, block: LatestBlock): Promise<void> {
        const span = trace.getSpan(context.active())!

        if (transaction.isExpired(block, this.transactionManager.blockTime)) {
            return transaction.changeStatus(TransactionStatus.Expired)
        }

        const nonce = this.transactionManager.nonceManager.requestNonce()

        span.addEvent("txm.tx-monitor.handle-not-attempted-transaction.requested-nonce", {
            transactionIntentId: transaction.intentId,
            nonce,
        })

        const { maxFeePerGas: marketMaxFeePerGas, maxPriorityFeePerGas: marketMaxPriorityFeePerGas } =
            this.transactionManager.gasPriceOracle.suggestGasForNextBlock()

        span.addEvent("txm.tx-monitor.handle-not-attempted-transaction.suggested-gas-price", {
            transactionIntentId: transaction.intentId,
            maxFeePerGas: Number(marketMaxFeePerGas),
            maxPriorityFeePerGas: Number(marketMaxPriorityFeePerGas),
        })

        const submissionResult = await this.transactionManager.transactionSubmitter.submitNewAttempt(transaction, {
            type: AttemptType.Original,
            nonce,
            maxFeePerGas: marketMaxFeePerGas,
            maxPriorityFeePerGas: marketMaxPriorityFeePerGas,
        })

        if (submissionResult.isErr() && !submissionResult.error.flushed) {
            span.recordException(unknownToError(submissionResult.error))
            span.setStatus({ code: SpanStatusCode.ERROR })
            this.transactionManager.nonceManager.returnNonce(nonce)
        }
    }

    @TraceMethod("txm.tx-monitor.handle-retry-transaction")
    private async handleRetryTransaction(transaction: Transaction): Promise<void> {
        const span = trace.getSpan(context.active())!

        const nonce = this.transactionManager.nonceManager.requestNonce()

        span.addEvent("txm.tx-monitor.handle-retry-transaction.requested-nonce", {
            transactionIntentId: transaction.intentId,
            nonce,
        })

        const { maxFeePerGas: marketMaxFeePerGas, maxPriorityFeePerGas: marketMaxPriorityFeePerGas } =
            this.transactionManager.gasPriceOracle.suggestGasForNextBlock()

        span.addEvent("txm.tx-monitor.handle-retry-transaction.suggested-gas-price", {
            transactionIntentId: transaction.intentId,
            maxFeePerGas: Number(marketMaxFeePerGas),
            maxPriorityFeePerGas: Number(marketMaxPriorityFeePerGas),
        })

        const submissionResult = await this.transactionManager.transactionSubmitter.submitNewAttempt(transaction, {
            type: AttemptType.Original,
            nonce,
            maxFeePerGas: marketMaxFeePerGas,
            maxPriorityFeePerGas: marketMaxPriorityFeePerGas,
        })

        if (submissionResult.isErr() && !submissionResult.error.flushed) {
            span.recordException(unknownToError(submissionResult.error))
            span.setStatus({ code: SpanStatusCode.ERROR })
            this.transactionManager.nonceManager.returnNonce(nonce)
        }
    }
}
