import { bigIntMax } from "@happy.tech/common"
import { type Result, err, ok } from "neverthrow"
import type { LatestBlock } from "./BlockMonitor.js"
import { Topics, eventBus } from "./EventBus.js"
import type { TransactionManager } from "./TransactionManager.js"

/**
 * This module estimates the gas price for transaction execution. It updates with each new block, basing its calculations on EIP-1559.
 *
 * The estimation considers the expected gas usage target per block, adjusting the next block's base fee
 * by incrementing or decrementing it by a certain percentage.
 *
 * Other parts of the application use the `suggestGasForNextBlock` function to get a gas recommendation at a given moment.
 *
 * This module adds a safety margin to the base gas, called `baseFeeMargin`, to prevent transactions from getting stuck in the mempool.
 * It's configurable in the `TransactionManager` constructor. The default value is 20%. The parameter is called `baseFeePercentageMargin`.
 *
 * This margin is necessary because a transaction must meet at least the base fee to be valid.
 *
 * If you only use the expected base fee for the next block and your transaction isn't included immediately,
 * it might become invalid if the base fee increases in subsequent blocks.
 *
 * Including a safety margin is prudent — if the base fee doesn't increase, the excess fee is refunded, so there's no loss.
 */
export class GasPriceOracle {
    private txmgr: TransactionManager
    private expectedNextBaseFeePerGas!: bigint
    private targetPriorityFee!: bigint

    constructor(_transactionManager: TransactionManager) {
        this.txmgr = _transactionManager
        eventBus.on(Topics.NewBlock, this.onNewBlock.bind(this))
    }

    async start() {
        const block = await this.txmgr.viemClient.getBlock({
            blockTag: "latest",
        })
        this.onNewBlock(block)
    }

    private async onNewBlock(block: LatestBlock) {
        const baseFeePerGas = block.baseFeePerGas
        const gasUsed = block.gasUsed
        const gasLimit = block.gasLimit

        this.expectedNextBaseFeePerGas = this.calculateExpectedNextBaseFeePerGas(
            baseFeePerGas as bigint,
            gasUsed,
            gasLimit,
        )
        const targetPriorityFeeResult = await this.calculateTargetPriorityFee()
        if (targetPriorityFeeResult.isErr()) {
            if (this.targetPriorityFee === undefined) {
                this.targetPriorityFee = this.txmgr.maxPriorityFeePerGas ?? 0n
            }
            return
        }
        this.targetPriorityFee = targetPriorityFeeResult.value
    }

    private async calculateTargetPriorityFee(): Promise<Result<bigint, Error>> {
        const feeHistory = await this.txmgr.viemClient.safeFeeHistory({
            blockCount: this.txmgr.priorityFeeAnalysisBlocks,
            blockTag: "latest",
            rewardPercentiles: [this.txmgr.priorityFeeTargetPercentile],
        })

        if (feeHistory.isErr()) {
            return err(feeHistory.error)
        }

        if (!feeHistory.value.reward) {
            return err(new Error("No fee history found"))
        }

        const priorityFee =
            feeHistory.value.reward.flat().reduce((acc, curr) => acc + BigInt(curr), 0n) /
            BigInt(feeHistory.value.reward.flat().length)

        if (this.txmgr.minPriorityFeePerGas && priorityFee < this.txmgr.minPriorityFeePerGas) {
            return ok(this.txmgr.minPriorityFeePerGas)
        }

        if (this.txmgr.maxPriorityFeePerGas && priorityFee > this.txmgr.maxPriorityFeePerGas) {
            return ok(this.txmgr.maxPriorityFeePerGas)
        }

        return ok(priorityFee)
    }

    private calculateExpectedNextBaseFeePerGas(baseFeePerGas: bigint, gasUsed: bigint, gasLimit: bigint): bigint {
        const targetGas = gasLimit / this.txmgr.eip1559.elasticityMultiplier

        if (gasUsed === targetGas) {
            return baseFeePerGas
        }

        const gasUsedDelta = gasUsed - targetGas
        const baseFeeDelta = (baseFeePerGas * gasUsedDelta) / targetGas / this.txmgr.eip1559.baseFeeChangeDenominator

        if (gasUsed > targetGas) {
            return baseFeePerGas + bigIntMax(baseFeeDelta, 1n)
        }
        return baseFeePerGas + baseFeeDelta
    }

    public suggestGasForNextBlock(): { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint } {
        const maxBaseFeePerGas = (this.expectedNextBaseFeePerGas * (100n + this.txmgr.baseFeeMargin)) / 100n
        const maxFeePerGas = maxBaseFeePerGas + this.targetPriorityFee
        return { maxFeePerGas, maxPriorityFeePerGas: this.targetPriorityFee }
    }
}
