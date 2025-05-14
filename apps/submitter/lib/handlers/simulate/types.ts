import type { Address, Bytes } from "@happy.tech/common"
import { type Boop, type EntryPointOutput, Onchain, SubmitterError } from "#lib/types"

// =====================================================================================================================
// INPUT

/** Input for a `simulate` call (`boop/simulate` route) */
export type SimulateInput = {
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint?: Address | undefined

    /** Boop for which to simulate gas limits and fee parameters. The gas limits and fee parameters are made optional. */
    boop: Boop
}

// =====================================================================================================================
// OUTPUT

/**
 * Possible output status of a `simulate` call (`boop/simulate` route).
 *
 * Either the status from a successfully attempted simulation ({@link OnchainStatus}), which may be either successful
 * or unsuccessful, or an error status indicating the simulation could not be carried out ({@link SubmitterError}.
 */
export const Simulate = {
    ...Onchain,
    ...SubmitterError,
} as const

/**
 * @inheritDoc Simulate
 * cf. {@link Simulate}
 */
export type SimulateStatus = (typeof Simulate)[keyof typeof Simulate]

/** Output of a `simulate` call (`boop/simulate` route): either a successful simulation, or a failed simulation. */
export type SimulateOutput = SimulateSuccess | SimulateError

// =====================================================================================================================
// OUTPUT (SUCCESS)

/** Successful `simulate` call. */
export type SimulateSuccess = EntryPointOutput & {
    status: typeof Onchain.Success

    /** Estimated max fee per gas (in wei) for the Boop. */
    maxFeePerGas: bigint

    /** Total fee requested by the submitter for submitting this boop (in wei). */
    submitterFee: bigint
}

// =====================================================================================================================
// OUTPUT (ERROR)

/**
 * Failed `simulate` call.
 *
 * It was either attempted but failed onchain (mostly likely due to failing validation), or it failed to be carried
 * out for offchain operational reasons (communication with the node, submitter capacity, etc...).
 *
 * You can use call {@link isOnchain} and {@link isSubmitterError} function
 * on the status to check if the error belongs to the respective categories.
 */
export type SimulateError = {
    status: Exclude<SimulateStatus, typeof Onchain.Success>

    /** TODO copy from execute/types.ts */
    revertData?: Bytes

    /** Description of the problem. */
    description: string
}

// =====================================================================================================================
