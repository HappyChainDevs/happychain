import { SpanStatusCode, context, trace } from "@opentelemetry/api"
import type { LatestBlock } from "./BlockMonitor.js"
import { Topics, eventBus } from "./EventBus.js"
import { AttemptType, TransactionStatus } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"
import { TxmMetrics } from "./telemetry/metrics"
import { TraceMethod } from "./telemetry/traces"
import { logger } from "./utils/logger"

/**
 * This module is responsible for retrieving transactions from the originators when a new block is received.
 * It also sorts the transactions by deadline, prioritizing those that will expire sooner.
 * Additionally, this module handles submitting the first attempt of every transaction and saves
 * the initial version of the Transaction object to the database (including its first attempt).
 */

export class TransactionCollector {
    private readonly txmgr: TransactionManager

    constructor(_txmgr: TransactionManager) {
        this.txmgr = _txmgr
        eventBus.on(Topics.NewBlock, this.onNewBlock.bind(this))
    }

    @TraceMethod("txm.transaction-collector.on-new-block")
    private async onNewBlock(block: LatestBlock) {
        const span = trace.getSpan(context.active())!

        const { maxFeePerGas, maxPriorityFeePerGas } = this.txmgr.gasPriceOracle.suggestGasForNextBlock()

        const transactionUnsorted = await Promise.all(this.txmgr.collectors.map((c) => c(block)))
        const transactionsBatch = transactionUnsorted
            .flat()
            .sort((a, b) => (a.deadline ?? Number.POSITIVE_INFINITY) - (b.deadline ?? Number.POSITIVE_INFINITY))
            .map((transaction) => {
                transaction.addCollectionBlock(block.number)
                return transaction
            })

        for (const transaction of transactionsBatch) {
            span.addEvent("txm.transaction-collector.on-new-block.collected-transaction", {
                transactionIntentId: transaction.intentId,
                transaction: transaction.toJson(),
                blockNumber: Number(block.number),
            })
        }

        const saveResult = await this.txmgr.transactionRepository.saveTransactions(transactionsBatch)

        if (saveResult.isErr()) {
            for (const transaction of transactionsBatch) {
                eventBus.emit(Topics.TransactionSaveFailed, { transaction })
            }
            logger.error("Error saving transactions", saveResult.error)

            span.addEvent("txm.transaction-collector.on-new-block.save-failed")
            span.recordException(saveResult.error)
            span.setStatus({ code: SpanStatusCode.ERROR })
            return
        }

        TxmMetrics.getInstance().transactionCollectedCounter.add(transactionsBatch.length)

        if (!this.txmgr.rpcLivenessMonitor.isAlive) {
            logger.error("RPC is not alive, skipping attempt to submit transactions")
            span.addEvent("txm.transaction-collector.on-new-block.rpc-not-alive")
            span.setStatus({ code: SpanStatusCode.ERROR })
            return
        }

        await Promise.all(
            transactionsBatch.map(async (transaction) => {
                const nonce = this.txmgr.nonceManager.requestNonce()

                span.addEvent("txm.transaction-collector.on-new-block.requested-nonce", {
                    transactionIntentId: transaction.intentId,
                    nonce,
                })

                if (transaction.status === TransactionStatus.Interrupted) {
                    transaction.changeStatus(TransactionStatus.Pending)
                }

                const submissionResult = await this.txmgr.transactionSubmitter.submitNewAttempt(transaction, {
                    type: AttemptType.Original,
                    nonce,
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                })

                if (submissionResult.isErr()) {
                    eventBus.emit(Topics.TransactionSubmissionFailed, {
                        transaction,
                        description: submissionResult.error.description,
                        cause: submissionResult.error.cause,
                    })

                    span.addEvent("txm.transaction-collector.on-new-block.submission-failed", {
                        transactionIntentId: transaction.intentId,
                        description: submissionResult.error.description,
                        cause: submissionResult.error.cause,
                    })
                    span.setStatus({ code: SpanStatusCode.ERROR })

                    if (!submissionResult.error.flushed) {
                        span.addEvent("txm.transaction-collector.on-new-block.returned-nonce", {
                            transactionIntentId: transaction.intentId,
                            nonce,
                        })
                        this.txmgr.nonceManager.returnNonce(nonce)
                    }
                }
            }),
        )
    }
}
