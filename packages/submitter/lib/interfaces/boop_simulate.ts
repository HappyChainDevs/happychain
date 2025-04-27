import type { Bytes } from "@happy.tech/common"
import type { Address } from "@happy.tech/common"
import type { EntryPointSubmitOutput } from "#lib/interfaces/contracts"
import type { PartialBoop } from "./Boop"
import type { EntryPointStatus, SubmitterErrorStatus } from "./status"

/**
 * Input for a `simulate` call.
 */
export type SimulateInput = {
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint?: Address | undefined

    /** Boop for which to simulate gas limits and fee parameters. The gas limits and fee parameters are made optional. */
    boop: PartialBoop
}

/**
 * Output of a `simulate` call: either a successful simulation, or a failed simulation (validation & checks failed),
 * or a validation that could not be carried out successfully for operational reasons.
 */
export type SimulateOutput = SimulateOutputSuccess | SimulateOutputFailed | SimulateOutputError

/**
 * Possible result of a `simulate` call: either the status from a successfully attempted
 * simulation ({@link EntryPointStatus}), which may be either successful or unsuccessful, or an error status indicating
 * the simulation could not be carried out ({@link SubmitterErrorStatus}.
 */
export type SimulateStatus = SubmitterErrorStatus | EntryPointStatus

/**
 * Output of a successful simulation.
 */
export type SimulateOutputSuccess = EntryPointSubmitOutput & {
    status: EntryPointStatus.Success

    /** Estimated max fee per gas (in wei) for the Boop. */
    maxFeePerGas: bigint

    /** Total fee requested by the submitter for submitting this Boop (in wei). */
    submitterFee: bigint
}

/**
 * Output of a simulation that was attempted, but failed onchain, most likely due validation or checks.
 */
export type SimulateOutputFailed = {
    status: Exclude<EntryPointStatus, EntryPointStatus.Success>

    /**
     * Depending on the status, either empty, or the revert data matching an EntryPointIllegalRevert
     * status, or the the returned encoded error matching an EntryPointRejection status.
     */
    revertData: Bytes

    /** Description of the problem. */
    description?: string
}

/**
 * Output of a simulation that failed to be carried out for offchain operational
 * reasons (communication with the node, submitter capacity, etc...).
 */
export type SimulateOutputError = {
    // check with `isSubmitterError(status)`
    status: SubmitterErrorStatus

    /** Description of the problem. */
    description?: string
}
