import { bigIntMax, promiseWithResolvers, unknownToError } from "@happychain/common"
import { type Result, ResultAsync, err, ok } from "neverthrow"
import { type GetTransactionReceiptErrorType, type TransactionReceipt, TransactionReceiptNotFoundError } from "viem"
import type { LatestBlock } from "./BlockMonitor.js"
import { Topics, eventBus } from "./EventBus.js"
import { type Attempt, AttemptType, type Transaction, TransactionStatus } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"

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

    private async onNewBlock(block: LatestBlock) {
        if (this.locked) {
            const pending = promiseWithResolvers<void>()
            this.pendingBlockPromises.push(pending)
            try {
                await pending.promise
            } catch {
                // A more recent block came while we were waiting, abort.
                return
            }
        }

        this.locked = true
        try {
            await this.handleNewBlock(block)
        } catch (error) {
            console.error("Error in handleNewBlock: ", error)
        }
        this.locked = false

        this.pendingBlockPromises.pop()?.resolve()
        this.pendingBlockPromises.forEach((p) => p.reject())
    }

    private async handleNewBlock(block: LatestBlock) {
        const transactions = this.transactionManager.transactionRepository.getNotFinalizedTransactions()

        const promises = transactions.map(async (transaction) => {
            const inAirAttempts = transaction.getInAirAttempts()

            // This could happen if, on the first try, the attempt to submit the transaction fails before flush
            if (inAirAttempts.length === 0) {
                return this.handleNotAttemptedTransaction(transaction, block)
            }

            let isResolved = false
            const { promise: receiptPromise, resolve, reject: _reject } = promiseWithResolvers<AttemptWithReceipt>()

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
                            return ok(attemptWithReceipt)
                        }
                        if (receiptResult.error instanceof TransactionReceiptNotFoundError) {
                            return ok(null)
                        }
                        return err(receiptResult.error)
                    },
                )
            const attemptOrResults = await Promise.race([receiptPromise, Promise.all(promises)])

            if (Array.isArray(attemptOrResults)) {
                /*
                    If there are any errors, then we should return because there is a risk 
                    that the transaction was executed and we don’t know
                */
                if (attemptOrResults.some((v) => v.isErr())) {
                    console.error(`Failed to get transaction receipt for transaction ${transaction.intentId}`)
                    return
                }

                return await (transaction.isExpired(block, this.transactionManager.blockTime)
                    ? this.handleExpiredTransaction(transaction)
                    : this.handleStuckTransaction(transaction))
            }

            const { attempt, receipt } = attemptOrResults

            if (receipt.status === "success") {
                if (attempt.type === AttemptType.Cancellation) {
                    console.error(`Transaction ${transaction.intentId} was cancelled`)
                    return transaction.changeStatus(TransactionStatus.Cancelled)
                }
                return transaction.changeStatus(TransactionStatus.Success)
            }

            const traceResult = this.transactionManager.rpcAllowDebug
                ? await this.transactionManager.viemClient.safeDebugTransaction(attempt.hash, {
                      tracer: "callTracer",
                  })
                : undefined

            if (!traceResult || traceResult.isErr()) {
                if (receipt.gasUsed === attempt.gas) {
                    return await this.handleOutOfGasTransaction(transaction)
                }
                console.error(`Transaction ${transaction.intentId} failed`)
                return transaction.changeStatus(TransactionStatus.Failed)
            }

            const trace = traceResult.value

            if (trace.revertReason === "Out of Gas") {
                await this.handleOutOfGasTransaction(transaction)
            } else {
                console.error(`Transaction ${transaction.intentId} failed with reason: ${trace.revertReason}`)
                return transaction.changeStatus(TransactionStatus.Failed)
            }
        })

        await Promise.all(promises)

        const result = await ResultAsync.fromPromise(
            this.transactionManager.transactionRepository.updateTransactions(transactions),
            unknownToError,
        )

        if (result.isErr()) {
            console.error("Error flushing transactions in onNewBlock")
        }
    }

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

    private async handleExpiredTransaction(transaction: Transaction): Promise<void> {
        const attempt = transaction.lastAttempt

        if (!attempt) {
            console.error(
                `Transaction ${transaction.intentId} inconsistent state: no attempt found in handleExpiredTransaction`,
            )
            return
        }

        const { replacementMaxFeePerGas, replacementMaxPriorityFeePerGas } = this.calcReplacementFee(
            attempt.maxFeePerGas,
            attempt.maxPriorityFeePerGas,
        )

        transaction.changeStatus(TransactionStatus.Cancelling)

        await this.transactionManager.transactionSubmitter.attemptSubmission(transaction, {
            type: AttemptType.Cancellation,
            nonce: attempt.nonce,
            maxFeePerGas: replacementMaxFeePerGas,
            maxPriorityFeePerGas: replacementMaxPriorityFeePerGas,
        })
    }

    private async handleStuckTransaction(transaction: Transaction): Promise<void> {
        const attempt = transaction.lastAttempt

        if (!attempt) {
            console.error(
                `Transaction ${transaction.intentId} inconsistent state: no attempt found in handleStuckTransaction`,
            )
            return
        }

        const { replacementMaxFeePerGas, replacementMaxPriorityFeePerGas } = this.calcReplacementFee(
            attempt.maxFeePerGas,
            attempt.maxPriorityFeePerGas,
        )

        await this.transactionManager.transactionSubmitter.attemptSubmission(transaction, {
            type: AttemptType.Original,
            nonce: attempt.nonce,
            maxFeePerGas: replacementMaxFeePerGas,
            maxPriorityFeePerGas: replacementMaxPriorityFeePerGas,
        })
    }

    private async handleNotAttemptedTransaction(transaction: Transaction, block: LatestBlock): Promise<void> {
        if (transaction.isExpired(block, this.transactionManager.blockTime)) {
            return transaction.changeStatus(TransactionStatus.Expired)
        }

        const nonce = this.transactionManager.nonceManager.requestNonce()

        const { maxFeePerGas: marketMaxFeePerGas, maxPriorityFeePerGas: marketMaxPriorityFeePerGas } =
            this.transactionManager.gasPriceOracle.suggestGasForNextBlock()

        const submissionResult = await this.transactionManager.transactionSubmitter.attemptSubmission(transaction, {
            type: AttemptType.Original,
            nonce,
            maxFeePerGas: marketMaxFeePerGas,
            maxPriorityFeePerGas: marketMaxPriorityFeePerGas,
        })

        if (submissionResult.isErr() && !submissionResult.error.flushed) {
            this.transactionManager.nonceManager.returnNonce(nonce)
        }
    }

    private async handleOutOfGasTransaction(transaction: Transaction): Promise<void> {
        const nonce = this.transactionManager.nonceManager.requestNonce()
        const { maxFeePerGas: marketMaxFeePerGas, maxPriorityFeePerGas: marketMaxPriorityFeePerGas } =
            this.transactionManager.gasPriceOracle.suggestGasForNextBlock()

        const submissionResult = await this.transactionManager.transactionSubmitter.attemptSubmission(transaction, {
            type: AttemptType.Original,
            nonce,
            maxFeePerGas: marketMaxFeePerGas,
            maxPriorityFeePerGas: marketMaxPriorityFeePerGas,
        })

        if (submissionResult.isErr() && !submissionResult.error.flushed) {
            this.transactionManager.nonceManager.returnNonce(nonce)
        }
    }
}
