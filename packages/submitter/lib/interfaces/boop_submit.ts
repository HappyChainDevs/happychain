import type { Address, Bytes, Hash } from "@happy.tech/common"
import type { Boop, PartialBoop } from "./Boop"

import { Onchain, type OnchainStatus } from "./Onchain"
import { SubmitterError, type SubmitterErrorStatus } from "./SubmitterError"

export type SubmitInput = {
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint?: Address | undefined

    /** Boop to execute. */
    boop: PartialBoop
}

/**
 * Possible result of a `submit` call.
 */
export const Submit = {
    ...Onchain,
    ...SubmitterError,
} as const

/**
 * @inheritDoc Submit
 * cf. {@link Submit}
 */
export type SubmitStatus = (typeof Submit)[keyof typeof Submit]

/**
 * Output of a `submit` call: either a successful submission, a
 * failed submission, or an offchain failure for other reasons.
 */
export type SubmitOutput = SubmitSuccess | SubmitSimulationFailed | SubmitError

/** Output type of successful `submit` calls. */
export type SubmitSuccess = {
    status: typeof Onchain.Success

    /** Hash of the submitted Boop */
    hash: Hash

    /** Hash of the transaction carrying the Boop */
    // TODO: I refuse
    txHash: Hash
}

/** Output type of `submit` who failed simulation "onchain". */
export type SubmitSimulationFailed = {
    status: Exclude<OnchainStatus, typeof Onchain.Success>

    /** Whether the error occurred at the simulation stage or at the submit stage. */
    stage: "simulate"

    /**
     * Depending on the status, either missing, or the revert data matching an `Onchain.*Reverted` status, or
     * the the returned encoded error matching an `Onchain.*Rejected` status. This pertains to simulation.
     */
    revertData?: Bytes

    /** Description of the problem. */
    description?: string
}

/** Output type of  `submit` calls that failed for other reasons. */
export type SubmitError = {
    status: SubmitterErrorStatus

    /** Whether the error occurred at the simulation stage or at the submit stage. */
    stage: "simulate" | "submit"

    /** Description of the problem. */
    description?: string
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
