import type { Hash } from "@happy.tech/common"
import type { StateRequestOutput } from "./HappyTxState"

export type ReceiptInput = {
    /** Hash of the HappyTx whose receipt is requested. */
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

/**
 * GET /submitter_receipt/${hash}
 * GET /submitter_receipt/${hash}?timeout=${timeout}
 *
 * Instructs the submitter to wait for the HappyTx's receipt then return.
 *
 * It may also return earlier if a user-specified or submitter-mandated timeout is reached.
 *
 * The submitter can return without a receipt if the HappyTx submission failed for other reasons.
 */
export declare function submitter_receipt(input: ReceiptInput): StateRequestOutput
