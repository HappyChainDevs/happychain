import { type UnionFill, bigIntMax, getProp } from "@happy.tech/common"
import { env } from "#lib/env"
import { blockService } from "#lib/services"
import { type EvmTxInfo, SubmitterError } from "#lib/types"
import { logger } from "#lib/utils/logger"

export type Fees = {
    maxFeePerGas: bigint
    maxPriorityFeePerGas: bigint
}

export type FeeInfo = {
    fees: Fees
    minFee: bigint
    minBlockFee: bigint
}

// biome-ignore format: pretty
export type FeeResult = UnionFill<
    | FeeInfo
    | { status: typeof SubmitterError.UnexpectedError, error: Error }
    | { status: typeof SubmitterError.GasPriceTooHigh, error: Error } & FeeInfo
>

function addPercent(num: bigint, percent: bigint): bigint {
    // The +1 below guarantee we don't get rounding error, which could cause errors if margins are configured to their
    // minimum valid value (e.g. 10% for env.FEE_BUMP_PERCENT)
    return (num * (100n + percent)) / 100n + 1n
}

const origin = "(either supplied by the sender or computed from the network)"

// TODO Get rid of the network error by being more stringent in the block service, refusing to acknowledge blocks
//      without fee info — this should probably never happen and should be caught at the most upstream.

/**
 * Returns all necessary fee information, optionally taking into account the need to replace another transaction
 * (specified as {@link replacedTx}.
 *
 * If there is no network error and the compute fee does not exceed maximum thresholds, returns an object with a {@link
 * Fees}-valued `fees` key that can be directly spliced into a Viem call, as well as `minFee` and `minBlockFee` keys
 * that indicates the absolute lowest `maxFeePerGas` the sequencer is willing to accept (`minFee` takes the replacement
 * tx into account, while `minBlockFee` doesn't. In that case:
 *
 * - `fees.maxFeePerGas` is computed by applying {@link env.BASEFEE_MARGIN} on top of the latest block basefee. If
 * that exceeds {@link env.MAX_BASEFEE}, it applies the lower {@link env.MIN_BASEFEE_MARGIN} instead. If a replaced
 * transaction is specified, it also ensures the value exceeds the replaced one by {@link env.FEE_BUMP_PERCENT}.
 *
 * - `minFee` is always computed using {@link env.MIN_BASEFEE_MARGIN}, and similarly ensure the fees is
 * replacement-compatible if needed. `minBlockFee` is the same but ignores the replacement transaction.
 *
 * - `fees.maxPriorityFeePerGas` is {@link env.INITIAL_PRIORITY_FEE}, or if replacing a transaction, the transaction's
 * priority fee bumped by {@link env.FEE_BUMP_PERCENT}.
 *
 * If however `fees.maxFeePerGas` and `fees.maxPriorityFeePerGas` computed in this way would exceed {@link
 * env.MAX_BASEFEE} or {@link env.MAX_PRIORITY_FEE} (respectively), then returns a `status` of {@link
 * SubmitterError.GasPriceTooHigh} and an {@link Error} object with an appropriate message. The invalid `fees` and
 * `minFee` (computed as in the regular case) are also included. Note that in this case `fees.maxFeePerGas === minFee`.
 *
 * If there is an network error fetching the fees, returns with a `status` of {@link SubmitterError.UnexpectedError} and
 * an {@link Error} object with an appropriate message.
 *
 * If a {@link logCtx} is provided, then we log when returning successfully but applying {@link env.MIN_BASEFEE_MARGIN}
 * instead of {@link env.BASEFEE_MARGIN}. The value is also passed to the log call.
 */
export function getFees(logCtx?: unknown, replacedTx?: EvmTxInfo): FeeResult {
    const lastBlock = blockService.getCurrentBlock()
    const lastBaseFee = lastBlock.baseFeePerGas ?? getProp(lastBlock, "gasPrice", "bigint")
    if (!lastBaseFee) {
        const error = Error("Block information did not contain the base fee")
        return { status: SubmitterError.UnexpectedError, error }
    }

    // The +1 below guarantee we don't get rounding error if margins are configured to be the exact max inter-block fee
    // rise or replacement bump margins.
    const minBlockBaseFee = addPercent(lastBaseFee, env.MIN_BASEFEE_MARGIN)
    const blockBaseFee = addPercent(lastBaseFee, env.BASEFEE_MARGIN)
    const minBlockFee = minBlockBaseFee + env.INITIAL_PRIORITY_FEE
    const replacementBaseFee = replacedTx //
        ? addPercent(replacedTx.maxFeePerGas - replacedTx.maxPriorityFeePerGas, env.FEE_BUMP_PERCENT)
        : 0n
    const replacementPriorityFee = replacedTx //
        ? addPercent(replacedTx.maxPriorityFeePerGas, env.FEE_BUMP_PERCENT)
        : 0n
    const maxPriorityFeePerGas = bigIntMax(env.INITIAL_PRIORITY_FEE, replacementPriorityFee)
    const minFee = bigIntMax(minBlockBaseFee, replacementBaseFee) + maxPriorityFeePerGas
    const maxFeePerGas = bigIntMax(blockBaseFee, replacementBaseFee) + maxPriorityFeePerGas
    const fees = { maxFeePerGas, maxPriorityFeePerGas }

    if (maxPriorityFeePerGas > env.MAX_PRIORITY_FEE) {
        const error = Error(`The maxPriorityFeePerGas ${origin} exceeds the submitter's max price.`)
        return { fees, minFee, minBlockFee, error, status: SubmitterError.GasPriceTooHigh }
    }

    if (maxFeePerGas > env.MAX_BASEFEE) {
        if (minFee > env.MAX_BASEFEE) {
            const error = Error(`The maxFeePerGas ${origin} exceeds the submitter's max price.`)
            return { fees, minFee, minBlockFee, error, status: SubmitterError.GasPriceTooHigh }
        }

        if (logCtx) logger.info("Basefee is above MAX_BASEFEE, falling back to MIN_BASEFEE_MARGIN", logCtx)
        fees.maxFeePerGas = minFee
    }

    return { fees, minFee, minBlockFee }
}
