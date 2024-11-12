import type { LatestBlock } from "./BlockMonitor.js"
import { Topics, eventBus } from "./EventBus.js"
import { AttemptType } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"

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

        const saveResult = await this.txmgr.transactionRepository.saveTransactions(transactionsBatch)

        // TODO: If flush fails, we should notify the user
        if (saveResult.isErr()) {
            throw saveResult.error
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
