import type { Address } from "@happy.tech/common"
import type { BoopReceipt } from "#lib/interfaces/BoopReceipt"
import { Onchain, type OnchainStatus } from "#lib/interfaces/Onchain"
import { SubmitterError, type SubmitterErrorStatus } from "#lib/interfaces/SubmitterError"
import type { Boop } from "./Boop"

/**
 * Possible results of a `submit` call.
 */
export const Execute = {
    ...Onchain,
    ...SubmitterError,
} as const

export type ExecuteStatus = (typeof Execute)[keyof typeof Execute]

export type ExecuteInput = {
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint?: Address | undefined

    /** Boop to execute. */
    boop: Boop
}

export type ExecuteOutput = ExecuteSuccess | ExecuteFailedOnchain | ExecuteError

/** Output of successful `execute` calls`. */
export type ExecuteSuccess = {
    status: typeof Onchain.Success

    /** Receipt for the included and successfully executed boop. */
    receipt: BoopReceipt
}

/** Output of `execute` calls that fail "onchain", either during simulation or execution. */
export type ExecuteFailedOnchain = {
    status: Exclude<OnchainStatus, typeof Onchain.Success>

    /** Whether the error occurred at the simulation or execution stages. */
    stage: "simulate" | "execute"

    /**
     * Depending on the status, either missing, or the revert data matching an `Onchain.*Reverted` status, or
     * the the returned encoded error matching an `Onchain.*Rejected` status. This pertains to simulation.
     */
    revertData?: string

    /** Receipt for the boop, if available. */
    receipt?: BoopReceipt

    /** Description of the problem. */
    description?: string
}

/** Output of `execute` calls that fail for other reasons. */
export type ExecuteError = {
    status: SubmitterErrorStatus

    /** Whether the error occurred at the simulation stage or at the submit stage. */
    stage: "simulate" | "submit" | "execute"

    /** Description of the problem. */
    description?: string
}

/**
 * POST `/api/v1/boop/execute`
 *
 * Given a boop, submits it onchain to be executed, waits for and returns the result of
 * execution.
 *
 * Unless `input.account === input.payer`, the `gasLimit`, `executeGasLimit`, `maxFeePerGas` and
 * `submitterFee` fields can be omitted and will be filled by the submitter.
 *
 * If the gas limits are provided, the submitter is free to perform or not perform simulation before
 * submitting.
 *
 * The submitter is nonce-aware and will buffer up to a certain amount of boop per nonce track,
 * depending on its configuration. It will submit boop whenever their nonces becomes eligible.
 *
 * To cancel a pending Boop, simply call with an empty replacement transaction.
 */
export declare function submitter_execute(input: ExecuteInput): ExecuteOutput
