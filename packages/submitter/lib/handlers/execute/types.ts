import type { Address } from "@happy.tech/common"
import type { BoopReceipt } from "#lib/types"
import { Onchain, type OnchainStatus } from "#lib/types"
import { SubmitterError, type SubmitterErrorStatus } from "#lib/types"
import type { Boop } from "../../types/Boop"

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

/** Output of `execute` calls that fail for "onchain" reasons. */
export type ExecuteFailedOnchain = {
    status: Exclude<OnchainStatus, typeof Onchain.Success>

    /** Whether the error occurred at the simulation or execution stages. */
    stage: "simulate" | "submit" | "execute"

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
