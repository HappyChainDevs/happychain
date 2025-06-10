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
export type SimulateSuccess = Omit<EntryPointOutput, "revertData"> & {
    status: typeof Onchain.Success

    /** Estimated max fee per gas (in wei) for the Boop. */
    maxFeePerGas: bigint

    /** Total fee requested by the submitter for submitting this boop (in wei). */
    submitterFee: bigint

    /** If true, indicates that the provided maxFeePerGas is lower than the current gas price. */
    feeTooLowDuringSimulation: boolean

    /**
     * If true, indicates that the maxFeePerGas (either provided by the sender,
     * or compute from the network) exceeded the submitter's maximum price.
     */
    feeTooHighDuringSimulation: boolean

    revertData?: undefined
    error?: undefined
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

    /**
     * If the status string ends in "Reverted" or "Rejected", this will hold the associated revert or rejection data,
     * if available.
     *
     * Note that this will be different from the revert data of the simulation of the EVM
     * tx that carried the boop, as first of all it might not have reverted (e.g. {@link
     * Onchain.ExecuteReverted} does not cause the transaction to revert when executed onchain),
     * and second we use "carrier errors" to transmit to tag the real errors with their context.
     *
     * True onchain reverts (as opposed to rejections) should be rare, as the system is set up to avoid them —
     * they can only result from incorrectly implemented accounts and paymasters, or from bugs in the submitter.
     */
    revertData?: Bytes

    /** Description of the problem. */
    error: string
}

// =====================================================================================================================
