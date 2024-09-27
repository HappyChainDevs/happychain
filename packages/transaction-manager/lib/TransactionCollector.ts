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

        await this.txmgr.transactionRepository.flush()

        for (const transaction of transactionsBatch) {
            const nonce = this.txmgr.nonceManager.requestNonce()

            await this.txmgr.transactionSubmitter.attemptSubmission(transaction, {
                type: AttemptType.Original,
                nonce,
                maxFeePerGas,
                maxPriorityFeePerGas,
            })
        }
    }
}
