import type { Optional } from "@happy.tech/common"
import type { Address } from "@happy.tech/common"
import type { Prettify } from "viem"
import type { Boop } from "./Boop"
import type { SimulationResult } from "./SimulationResult"
import type { EntryPointStatus, SubmitterErrorSimulationUnavailable } from "./status"

export type SimulationInput = {
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint?: Address | undefined

    /**
     * Boop for which to simulate gas limits and fee parameters. The gas limits and fee
     * parameters are made optional.
     */
    tx: Optional<Boop, "gasLimit" | "executeGasLimit" | "maxFeePerGas" | "submitterFee">
}

export type SimulationStatus = SubmitterErrorSimulationUnavailable | EntryPointStatus

// biome-ignore format: readability
export type SimulationOutput = Prettify<(
    {
        // check with `isSubmitterError(status)`
        status: SubmitterErrorSimulationUnavailable
    } | {
        // check with `isEntryPointStatus(status)`
        status: EntryPointStatus

        /** Simulation result, included only if `!isSubmitterError(status)`. */
        simulationResult: SimulationResult | undefined

        /** Estimate max fee per gas (in wei) for the Boop. */
        maxFeePerGas: bigint

        /** Total fee requested by the submitter for submitting this Boop (in wei). */
        submitterFee: bigint
    }
) & (
    {
        status: Exclude<SimulationStatus, EntryPointStatus.Success>
    } | {
        // check with `status === EntryPointStatus.Success`
        status: EntryPointStatus.Success

        /** Gas limit for the transaction made by the submitter */
        gasLimit: bigint
        /** Gas limit for IHappyAccount.execute */
        executeGasLimit: bigint
        /** Gas limit for IHappyAccount.validate */
        validateGasLimit: bigint
        /** Gas limit for IHappyPaymaster.validatePayment */
        validatePaymentGasLimit: bigint
    }
)>

/**
 * POST `/api/v1/boop/simulate`
 *
 * Given a boop possibly missing some gas limits or gas fee parameters, returns estimates for
 * these limits and parameters, and the result of simulation.
 *
 * Note that the boop is also allowed to be different in some way than the one for which the gas
 * values will be used, e.g. for accounts that validate a signature, the validationData could be
 * empty or include a dummy value.
 *
 * If any gas limit *is* specified, it is passed along as-is during simulation and not filled in
 * by the submitter.
 *
 * Calling this endpoint does *not* create a state for the Boop on the submitter.
 */
export declare function submitter_simulate(input: SimulationInput): SimulationOutput
