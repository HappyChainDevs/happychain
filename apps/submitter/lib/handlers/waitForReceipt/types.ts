import type { Bytes, Hash } from "@happy.tech/common"
import { GetState } from "#lib/handlers/getState/types"
import { type BoopReceipt, Onchain, SubmitterError } from "#lib/types"

// =====================================================================================================================
// INPUT

/** Input of a `waitForReceipt` call (`boop/receipt` route). */
export type WaitForReceiptInput = {
    /** Hash of the boop whose receipt is requested. */
    boopHash: Hash

    /**
     * Optional time to wait for the receipt, otherwise the submitter will use its default value.
     *
     * The submitter is free to honor this timeout or not based on its own policies (e.g. it
     * might not apply a timeout that is too low or set a cap on the maximum timeout value).
     */
    timeout?: number
}

// =====================================================================================================================
// OUTPUT

/** Possible output status of a `waitForReceipt` call (`boop/receipt` route). */
export const WaitForReceipt = {
    ...Onchain,
    ...SubmitterError,
    UnknownBoop: GetState.UnknownBoop,
} as const

/**
 * @inheritDoc WaitForReceipt
 * cf. {@link WaitForReceipt}
 */
export type WaitForReceiptStatus = (typeof WaitForReceipt)[keyof typeof WaitForReceipt]

/** Output of a `waitForReceipt` call (`boop/receipt` route): either success or error. */
export type WaitForReceiptOutput = WaitForReceiptSuccess | WaitForReceiptError

// =====================================================================================================================
// OUTPUT (SUCCESS)

/** Successful `waitForReceipt` call. */
export type WaitForReceiptSuccess = {
    status: typeof WaitForReceipt.Success
    receipt: BoopReceipt
    revertData?: undefined
    error?: undefined
}

// =====================================================================================================================
// OUTPUT (ERROR)

/** Failed `waitForReceipt` call. */
export type WaitForReceiptError = {
    status: Exclude<WaitForReceiptStatus, typeof WaitForReceipt.Success>

    /**
     * If the status string ends in "Reverted" or "Rejected", this will hold the associated revert or rejection data,
     * if available.
     *
     * Note that this will be different from the revert data of the onchain execution of the
     * EVM tx that carried the boop, as first of all it might not have reverted (e.g. {@link
     * Onchain.ExecuteReverted} does not cause the transaction to revert when executed onchain),
     * and second we use "carrier errors" to transmit to tag the real errors with their context.
     *
     * !! At the moment, this will always be undefined or empty. !!
     *
     * We can't parse the revert data from onchain execution — this is an EVM RPC limitation that is
     * difficult to work around (it requires tracing the transaction in its intra-block context).
     *
     * True onchain reverts (as opposed to rejections) should be rare, as the system is set up to avoid them —
     * they can only result from incorrectly implemented accounts and paymasters, or from bugs in the submitter.
     */
    revertData?: Bytes

    /** Description of the problem. */
    error: string

    receipt?: undefined
}

// =====================================================================================================================
