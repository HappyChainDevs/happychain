import { unknownToError } from "@happychain/common"
import { ResultAsync } from "neverthrow"
import { Topics, eventBus } from "./EventBus.js"
import { AttemptType } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"

export class TransactionCollector {
    private readonly txmgr: TransactionManager

    constructor(_txmgr: TransactionManager) {
        this.txmgr = _txmgr
        eventBus.on(Topics.NewBlock, this.onNewBlock.bind(this))
    }

    private async onNewBlock() {
        const { maxFeePerGas, maxPriorityFeePerGas } = this.txmgr.gasPriceOracle.suggestGasForNextBlock()

        const transactionsBatch = this.txmgr.collectors
            .flatMap((c) => c())
            .sort((a, b) => (a.deadline ?? Number.POSITIVE_INFINITY) - (b.deadline ?? Number.POSITIVE_INFINITY))

        this.txmgr.transactionRepository.saveTransactions(transactionsBatch)

        // TODO: If flush fails, we should notify the user
        const flushResult = await ResultAsync.fromPromise(this.txmgr.transactionRepository.flush(), unknownToError)

        if (flushResult.isErr()) {
            console.error("Failed to flush transactions", flushResult.error)
            this.txmgr.transactionRepository.removeTransactions(transactionsBatch)
            throw flushResult.error
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
                    this.txmgr.nonceManager.returnNonce(nonce)
                }
            }),
        )
    }
}
