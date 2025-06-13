import { bigIntMax, getProp } from "@happy.tech/common"
import { env } from "#lib/env"
import { blockService } from "#lib/services"
import type { EvmTxInfo } from "#lib/types"

export type Fees = {
    maxFeePerGas: bigint
    maxPriorityFeePerGas: bigint
}

function addPercent(num: bigint, percent: bigint): bigint {
    return (num * (100n + percent)) / 100n
}

/**
 * Returns fees for sending a transaction now, optionally taking into account that this is a replacement transaction.
 */
export function getFees(replacedTx?: EvmTxInfo): Fees {
    const lastBaseFee = getLastBaseFee()
    let baseFee = addPercent(lastBaseFee, env.BASEFEE_MARGIN)
    if (baseFee > env.MAX_BASEFEE) baseFee = getMinFeeNoReplaced()
    const maxFeePerGas = baseFee + env.INITIAL_PRIORITY_FEE
    const maxPriorityFeePerGas = env.INITIAL_PRIORITY_FEE
    if (!replacedTx) return { maxFeePerGas, maxPriorityFeePerGas }
    const minFees = getMinReplacementFees(replacedTx)
    return {
        maxFeePerGas: bigIntMax(maxFeePerGas, minFees.maxFeePerGas),
        maxPriorityFeePerGas: bigIntMax(maxPriorityFeePerGas, minFees.maxPriorityFeePerGas),
    }
}

/**
 * Returns the minimum maxFeePerGas the submitter is willing to use for the current
 * block, optionally taking into account that this is a replacement transaction.
 *
 * This will return a lower basefee than {@link getFees} — it applies a {@link env.MIN_BASEFEE_MARGIN}
 * increase to the last block's base fee, instead of {@link env.BASEFEE_MARGIN}
 */
export function getMinFee(replacedTx?: EvmTxInfo): bigint {
    const maxFeePerGas = getMinFeeNoReplaced()
    if (!replacedTx) return maxFeePerGas
    const minReplacementFee = getMinReplacementFees(replacedTx).maxFeePerGas
    return bigIntMax(maxFeePerGas, minReplacementFee)
}

/**
 * Returns the base fee from the most recent block.
 * @throws Error if the block has missing fee information
 * @returns The base fee per gas from the latest block
 */
export function getLastBaseFee(): bigint {
    const lastBlock = blockService.getCurrentBlock()
    const baseFee = lastBlock.baseFeePerGas ?? getProp(lastBlock, "gasPrice", "bigint")
    if (!baseFee) throw Error("Error fetching the fees: the RPC sent a block with missing fee information")
    return baseFee
}

function getMinFeeNoReplaced(): bigint {
    return addPercent(getLastBaseFee(), env.MIN_BASEFEE_MARGIN) + env.INITIAL_PRIORITY_FEE
}

/**
 * Returns the minimum fees for a replacement transaction (applying {@link env.FEE_BUMP_PERCENT}).
 * This does NOT account for current gas price!
 */
function getMinReplacementFees(replacedTx: EvmTxInfo): Fees {
    // + 1n is insurance that the fee rise in case they're extremely low
    return {
        maxFeePerGas: addPercent(replacedTx.maxFeePerGas, env.FEE_BUMP_PERCENT) + 1n,
        maxPriorityFeePerGas: addPercent(replacedTx.maxPriorityFeePerGas, env.FEE_BUMP_PERCENT) + 1n,
    }
}
