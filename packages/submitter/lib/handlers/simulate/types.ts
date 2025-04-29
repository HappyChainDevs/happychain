import type { Address, Bytes } from "@happy.tech/common"
import type { Boop, EntryPointOutput } from "#lib/types"
import { Onchain, type OnchainStatus, SubmitterError, type SubmitterErrorStatus } from "#lib/types"

/**
 * Input for a `simulate` call.
 */
export type SimulateInput = {
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint?: Address | undefined

    /** Boop for which to simulate gas limits and fee parameters. The gas limits and fee parameters are made optional. */
    boop: Boop
}

/**
 * Possible result of a `simulate` call: either the status from a successfully attempted
 * simulation ({@link OnchainStatus}), which may be either successful or unsuccessful, or an error status indicating
 * the simulation could not be carried out ({@link SubmitterError}.
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

/**
 * Output of a `simulate` call: either a successful simulation, or a failed
 * simulation, or a simulation that could not be carried out for other reasons.
 */
export type SimulateOutput = SimulateSuccess | SimulateFailed | SimulateError

/**
 * Output of a successful simulation.
 */
export type SimulateSuccess = EntryPointOutput & {
    status: typeof Onchain.Success

    /** Estimated max fee per gas (in wei) for the Boop. */
    maxFeePerGas: bigint

    /** Total fee requested by the submitter for submitting this Boop (in wei). */
    submitterFee: bigint
}

/**
 * Output of a simulation that was attempted, but failed onchain, most likely due validation or checks.
 */
export type SimulateFailed = {
    status: Exclude<OnchainStatus, typeof Onchain.Success>

    /**
     * Depending on the status, either missing, or the revert data matching an `Onchain.*Reverted`
     * status, or the the returned encoded error matching an `Onchain.*Rejected` status.
     */
    revertData?: Bytes

    /** Description of the problem. */
    description?: string
}

/**
 * Output of a simulation that failed to be carried out for offchain operational
 * reasons (communication with the node, submitter capacity, etc...).
 */
export type SimulateError = {
    // check with `isSubmitterError(status)`
    status: SubmitterErrorStatus

    /** Description of the problem. */
    description?: string
}
