import type { Address, Bytes, Hash } from "@happy.tech/common"
import { type Boop, Onchain, SubmitterError } from "#lib/types"

// =====================================================================================================================
// INPUT

/** Input of a `submit` call (`boop/submit` route). */
export type SubmitInput = {
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint?: Address | undefined

    /** Boop to execute. */
    boop: Boop
}

// =====================================================================================================================
// OUTPUT

/** Possible output status of a `submit` call (`boop/submit` route). */
export const Submit = {
    ...Onchain,
    ...SubmitterError,
} as const

/**
 * @inheritDoc Submit
 * cf. {@link Submit}
 */
export type SubmitStatus = (typeof Submit)[keyof typeof Submit]

/** Output of a `submit` call (`boop/submit` route): either a successful submission, a failed submission. */
export type SubmitOutput = SubmitSuccess | SubmitError

// =====================================================================================================================
// OUTPUT (SUCCESS)

/** Successful `submit` call. */
export type SubmitSuccess = {
    status: typeof Onchain.Success

    /** Hash of the submitted Boop */
    boopHash: Hash

    /** EntryPoint to which the boop was submitted onchain. */
    entryPoint: Address

    revertData?: undefined
    error?: undefined
}

// =====================================================================================================================
// OUTPUT (ERROR)

/** Failed `submit` call. */
export type SubmitError = {
    status: Exclude<SubmitStatus, typeof Onchain.Success>

    /** Whether the error occurred at the simulation stage or at the submit stage. */
    stage: "simulate" | "submit"

    /**
     * If the status string ends in "Reverted" or "Rejected", this will hold the associated revert or rejection data,
     * if available.
     *
     * Note that this will be different from the revert data of the simulation of the EVM
     * tx that carried the boop, as first of all it might not have reverted (e.g. {@link
     * Onchain.ExecuteReverted} does not cause the transaction to revert when executed onchain),
     * and second we use "carrier errors" to transmit to tag the real errors with their context.
     */
    revertData?: Bytes

    /** Description of the problem. */
    error: string

    boopHash?: undefined
    entryPoint?: undefined
}

// =====================================================================================================================
