import type { Address, Hash } from "@happy.tech/common"
import type { Boop } from "./Boop"
import type { SubmitterErrorStatus } from "./status"

export type SubmitSuccess = "submitSuccess"
export const SubmitSuccess = "submitSuccess" as const

export type SubmitStatus =
    | SubmitSuccess
    | SubmitterErrorStatus.UnexpectedError
    | SubmitterErrorStatus.BufferExceeded
    | SubmitterErrorStatus.OverCapacity

export type SubmitInput = {
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint?: Address | undefined

    /** Boop to execute. */
    tx: Boop
}

export type SubmitOutput =
    | {
          status: SubmitSuccess
          /** Hash of the submitted Boop */
          hash: Hash
      }
    | {
          status: Exclude<SubmitStatus, SubmitSuccess>
          hash?: never
      }

/**
 * POST `/api/v1/boop/submit`
 *
 * Given a Boop, sends it to the submitter which will either accept it and return its hash,
 * or fail with a rejection status.
 *
 * The submitter is nonce-aware and will buffer up to a certain amount of boop per nonce track,
 * depending on its configuration. It will submit boops whenever their nonces becomes eligible.
 *
 * The submitter will then attempt to submit the transaction onchain. The state of the Boop
 * can be queried with `submitter_state`.
 *
 * If the gas limits are provided, the submitter is free to perform or not perform simulation before
 * submitting.
 *
 * If the submitter already has a pending Boop with the same nonce for this account, it will
 * cancel the existing one on the condition that the new Boop passes validation. It can also
 * impose additional restrictions, such as requesting a higher submitterFee for the replacement
 * transaction.
 *
 * To cancel a pending Boop, simply call with an empty replacement transaction.
 */
export declare function submitter_submit(input: Boop): SubmitOutput

export enum SubmitCancelStatus {
    /** The cancellation was successfully submitted — it can still fail. */
    Success = "executeCancelSuccess",

    /** The cancellation failed because the original was included onchain. */
    OriginalIncluded = "executeCancelFailure",
}
