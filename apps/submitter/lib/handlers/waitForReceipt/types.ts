import type { Address, Bytes, Hash } from "@happy.tech/common"
import { GetState } from "#lib/handlers/getState/types"
import { type BoopReceipt, Onchain, SubmitterError } from "#lib/types"

// =====================================================================================================================
// INPUT

/** Input of a `waitForReceipt` call (`boop/receipt` route). */
export type WaitForReceiptInput = {
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint?: Address

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
}

// =====================================================================================================================
// OUTPUT (ERROR)

/** Failed `waitForReceipt` call. */
export type WaitForReceiptError = {
    status: Exclude<WaitForReceiptStatus, typeof WaitForReceipt.Success>

    /** TODO copy from execute/types.ts */
    revertData?: Bytes

    /** Description of the problem. */
    description: string
}

// =====================================================================================================================
