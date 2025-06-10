import type { Hash } from "@happy.tech/common"
import type { SimulateOutput } from "#lib/handlers/simulate/types"
import { type BoopReceipt, SubmitterError } from "#lib/types"

// =====================================================================================================================
// INPUT

/** Input for a `getState` call (`boop/state` route) */
export type GetStateInput = {
    /** Hash of the boop whose state to retrieve. */
    boopHash: Hash
}

// =====================================================================================================================
// OUTPUT

/** Possible output status of a `getState` call (`boop/state` route). Possible results of a `state` call. */
export const GetState = {
    Receipt: "getStateReceipt",
    Simulated: "getStateSimulated",
    UnknownState: "getStateUnknownState",
    UnknownBoop: "getStateUnknownBoop",
    ...SubmitterError,
} as const

/**
 * @inheritDoc GetState
 * cf. {@link GetState}
 */
export type GetStateStatus = (typeof GetState)[keyof typeof GetState]

/**
 * Output for a `getState` call (`boop/state` route): either the boop landed onchain and a
 * receipt is available, or it was simulated and a result is available, or an error output.
 */
export type GetStateOutput = GetStateReceipt | GetStateSimulated | GetStateError

// =====================================================================================================================
// OUTPUT (SUCCESS)

/** The boop landed onchain and a receipt is available. */
export type GetStateReceipt = {
    status: typeof GetState.Receipt
    receipt: BoopReceipt
    simulation?: undefined
    error?: undefined
}

/** The boop was simulated and the simulation result is available. */
export type GetStateSimulated = {
    status: typeof GetState.Simulated
    simulation: SimulateOutput
    receipt?: undefined
    error?: undefined
}

// =====================================================================================================================
// OUTPUT (ERROR)

/** Could not get boop state, or the boop is unknown. */
export type GetStateError = {
    status: Exclude<GetStateStatus, typeof GetState.Receipt | typeof GetState.Simulated>
    error: string
    receipt?: undefined
    simulation?: undefined
}

// =====================================================================================================================
