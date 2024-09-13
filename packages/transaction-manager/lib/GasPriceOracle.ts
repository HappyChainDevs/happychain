import { bigIntMax } from "@happychain/common"
import type { Block } from "viem"
import { Topics, eventBus } from "./EventBus.js"
import type { TransactionManager } from "./transaction-manager/TransactionManager.js"

export class GasPriceOracle {
    private txmgr: TransactionManager
    private expectedNextBaseFeePerGas!: bigint

    constructor(_transactionManager: TransactionManager) {
        this.txmgr = _transactionManager
        eventBus.on(Topics.NewBlock, this.onNewBlock.bind(this))
    }

    private onNewBlock(block: Block) {
        const baseFeePerGas = block.baseFeePerGas
        const gasUsed = block.gasUsed
        const gasLimit = block.gasLimit

        this.expectedNextBaseFeePerGas = this.calculateExpectedNextBaseFeePerGas(
            baseFeePerGas as bigint,
            gasUsed,
            gasLimit,
        )
    }

    private calculateExpectedNextBaseFeePerGas(baseFeePerGas: bigint, gasUsed: bigint, gasLimit: bigint): bigint {
        const targetGas = gasLimit / this.txmgr.eip1559.elasticityMultiplier

        if (gasUsed === targetGas) {
            return baseFeePerGas
        }

        const gasUsedDelta = gasUsed - targetGas
        const baseFeeDelta = (baseFeePerGas * gasUsedDelta) / targetGas / this.txmgr.eip1559.baseFeeChangeDenominator

        if (targetGas > gasUsed) {
            return baseFeePerGas + bigIntMax(baseFeeDelta, 1n)
        }
        return baseFeePerGas + baseFeeDelta
    }

    public suggestGasForNextBlock(): { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint } {
        const maxBaseFeePerGas = (this.expectedNextBaseFeePerGas * (100n + this.txmgr.baseFeeMargin)) / 100n
        const maxFeePerGas = maxBaseFeePerGas + this.txmgr.maxPriorityFeePerGas
        return { maxFeePerGas, maxPriorityFeePerGas: this.txmgr.maxPriorityFeePerGas }
    }
}
