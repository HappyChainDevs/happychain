import type { Address, Optional } from "@happy.tech/common"
import type { HappyTx } from "./HappyTx"
import type { SimulationResult } from "./SimulationResult"
import type { EntryPointStatus, SubmitterErrorSimulationUnavailable } from "./status"

export type EstimateGasInput = {
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint?: Address | undefined

    /**
     * HappyTx for which to estimate gas limits and fee parameters. The gas limits and fee
     * parameters are made optional.
     */
    tx: Optional<HappyTx, "gasLimit" | "executeGasLimit" | "maxFeePerGas" | "submitterFee">
}

export type EstimateGasStatus = SubmitterErrorSimulationUnavailable | EntryPointStatus

// biome-ignore format: readability
export type EstimateGasOutput = (
    {
        // check with `isSubmitterError(status)`
        status: SubmitterErrorSimulationUnavailable
    } | {
        // check with `isEntryPointStatus(status)`
        status: EntryPointStatus

        /** Simulation result, included only if `!isSubmitterError(status)`. */
        simulationResult: SimulationResult

        /** Estimate max fee per gas (in wei) for the HappyTx. */
        maxFeePerGas: bigint

        /** Total fee requested by the submitter for submitting this HappyTx (in wei). */
        submitterFee: bigint
    }
) & (
    {
        status: Exclude<EstimateGasStatus, EntryPointStatus.Success>
    } | {
        // check with `status === EntryPointStatus.Success`
        status: EntryPointStatus.Success

        /** Estimated gas limit for the HappyTx. */
        gasLimit: bigint

        /** Estimated gas limit for the account's `execute` call. */
        executeGasLimit: bigint
    }
)

/**
 * POST /submitter_estimateGas
 *
 * Given a happyTx possibly missing some gas limits or gas fee parameters, returns estimates for
 * these limits and parameters, and the result of simulation.
 *
 * Note that the happyTx is also allowed to be different in some way than the one for which the gas
 * values will be used, e.g. for accounts that validate a signature, the validationData could be
 * empty or include a dummy value.
 *
 * If any gas limit *is* specified, it is passed along as-is during simulation and not filled in
 * by the submitter.
 *
 * Calling this endpoint does *not* create a state for the HappyTx on the submitter.
 */
export declare function submitter_estimateGas(input: EstimateGasInput): EstimateGasOutput
