import type { Hash } from "@happy.tech/common"
import { GetState } from "#lib/handlers/getState/types"
import type { SimulateOutput } from "#lib/handlers/simulate/types"
import { type BoopReceipt, SubmitterError, type SubmitterErrorStatus } from "#lib/types"

// TODO documentation

export const WaitForReceipt = {
    Success: GetState.Receipt,
    UnknownBoop: GetState.UnknownBoop,
    ...SubmitterError,
} as const

export type WaitForReceiptStatus = (typeof WaitForReceipt)[keyof typeof WaitForReceipt]

export type WaitForReceiptInput = {
    /** Hash of the Boop whose receipt is requested. */
    hash: Hash

    /**
     * Optional time to wait for the receipt.
     *
     * This should be set slightly lower (~2s) lower than a client-side timeout.
     * If unspecified, the submitter will use its default timeout value.
     *
     * The submitter is free to honor this timeout or not based on its own policies (e.g. it
     * might not apply a timeout that is too low or set a cap on the maximum timeout value).
     */
    timeout?: number | undefined
}

export type WaitForReceiptOutput = WaitForReceiptSuccess | WaitForReceiptUnknown | WaitForReceiptError

export type WaitForReceiptSuccess = {
    status: typeof WaitForReceipt.Success
    receipt: BoopReceipt
}

export type WaitForReceiptError = {
    status: SubmitterErrorStatus
    simulation?: SimulateOutput
    description?: string
}

export type WaitForReceiptUnknown = {
    status: typeof WaitForReceipt.UnknownBoop
}
