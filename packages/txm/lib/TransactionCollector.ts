import type { LatestBlock } from "./BlockMonitor.js"
import { Topics, eventBus } from "./EventBus.js"
import { AttemptType } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"

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

    private async onNewBlock(block: LatestBlock) {
        const { maxFeePerGas, maxPriorityFeePerGas } = this.txmgr.gasPriceOracle.suggestGasForNextBlock()

        const transactionUnsorted = await Promise.all(this.txmgr.collectors.map((c) => c(block)))
        const transactionsBatch = transactionUnsorted
            .flat()
            .sort((a, b) => (a.deadline ?? Number.POSITIVE_INFINITY) - (b.deadline ?? Number.POSITIVE_INFINITY))
            .map((transaction) => {
                transaction.addCollectionBlock(block.number)
                return transaction
            })

        const saveResult = await this.txmgr.transactionRepository.saveTransactions(transactionsBatch)

        if (saveResult.isErr()) {
            for (const transaction of transactionsBatch) {
                eventBus.emit(Topics.TransactionSaveFailed, { transaction })
            }
            console.error("Error saving transactions", saveResult.error)
            return
        }

        await Promise.all(
            transactionsBatch.map(async (transaction) => {
                const nonce = this.txmgr.nonceManager.requestNonce()

                const submissionResult = await this.txmgr.transactionSubmitter.attemptSubmission(transaction, {
                    type: AttemptType.Original,
                    nonce,
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                })

                if (submissionResult.isErr() && !submissionResult.error.flushed) {
                    eventBus.emit(Topics.TransactionSubmissionFailed, {
                        transaction,
                        description: submissionResult.error.description,
                    })
                    this.txmgr.nonceManager.returnNonce(nonce)
                }
            }),
        )
    }
}
