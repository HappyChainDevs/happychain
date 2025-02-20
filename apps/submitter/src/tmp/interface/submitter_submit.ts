import type { HappyTx } from "./HappyTx"
import type { HappyTxReceipt } from "./HappyTxReceipt"
import type { Hash } from "./common_chain"
import type { SubmitterErrorStatus } from "./status"

export type SubmitSuccess = "submitSuccess"
export const SubmitSuccess = "submitSuccess" as const

export type SubmitStatus =
    | SubmitSuccess
    | SubmitterErrorStatus.UnexpectedError
    | SubmitterErrorStatus.BufferExceeded
    | SubmitterErrorStatus.OverCapacity

export type SubmitOutput =
    | {
          status: SubmitSuccess
          /** Hash of the submitted HappyTx */
          hash: Hash
      }
    | {
          status: Exclude<SubmitStatus, SubmitSuccess>
          hash?: never
      }

/**
 * POST /submitter_submit
 *
 * Given a HappyTx, sends it to the submitter which will either accept it and return its hash,
 * or fail with a rejection status.
 *
 * The submitter is nonce-aware and will buffer up to a certain amount of happyTx per nonce track,
 * depending on its configuration. It will submit happyTxs whenever their nonces becomes eligible.
 *
 * The submitter will then attempt to submit the transaction onchain. The state of the HappyTx
 * can be queried with `submitter_state`.
 *
 * If the gas limits are provided, the submitter is free to perform or not perform simulation before
 * submitting.
 *
 * If the submitter already has a pending HappyTx with the same nonce for this account, it will
 * cancel the existing one on the condition that the new HappyTx passes validation. It can also
 * impose additional restrictions, such as requesting a higher submitterFee for the replacement
 * transaction.
 */
export declare function submitter_submit(input: HappyTx): SubmitOutput

export enum SubmitCancelStatus {
    /** The cancellation was successfully submitted — it can still fail. */
    Success = "executeCancelSuccess",

    /** The cancellation failed because the original was included onchain. */
    OriginalIncluded = "executeCancelFailure",
}

// biome-ignore format: readability
export type SubmitCancelOutput = {
    status: SubmitCancelStatus.Success

    /** Hash of the transaction (*not* HappyTx!) that will cancel the original HappyTx. */
    hash: Hash
    receipt?: never
} | {
    status: SubmitCancelStatus.OriginalIncluded

    /** Receipt for the original transaction that was included onchain. */
    receipt: HappyTxReceipt
    hash?: never
} | {
    status: Exclude<
        SubmitterErrorStatus,
        SubmitterErrorStatus.SimulationTimeout | SubmitterErrorStatus.ReceiptTimeout
    >
    hash?: never
    receipt?: never
}

/**
 * (Not an entrypoint.)
 *
 * This helper function submits a cancellation for a pending HappyTx. Under the hood, calls {@link
 * submitter_submit} with an empty replacement transaction.
 */
export declare function submitter_executeCancel(input: Hash): SubmitCancelOutput
