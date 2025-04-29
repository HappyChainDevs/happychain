import type { Hash } from "@happy.tech/common"
import type { StateRequestOutput } from "#lib/handlers/getState"

export type ReceiptRequestInput = {
    /** Hash of the Boop whose receipt is requested. */
    hash: Hash

    /**
     * Optional time to wait for the receipt.
     *
     * This should be set slightly lower (~2s) lower than a client-side timeout.
     * If unspecified, the submitter will use its default timeout value.
     *
     * The submitter is free to honor this timeout or not based on its own policies (e.g. it might
     * not apply a timeout that is too low or set a cap on the maximum timeout value).
     */
    timeout?: number | undefined
}

export type ReceiptRequestOutput = StateRequestOutput
