import type { Address, Hash } from "@happy.tech/common"
import type { SimulateOutput } from "#lib/handlers/simulate/types"
import { type BoopReceipt, SubmitterError, type SubmitterErrorStatus } from "#lib/types"

// TODO documentation

/**
 * Possible results of a `state` call.
 */
export const GetState = {
    Receipt: "getStateReceipt",
    Simulated: "getStateSimulated",
    UnknownBoop: "getStateUnknownBoop",
    ...SubmitterError,
} as const

export type GetStateStatus = (typeof GetState)[keyof typeof GetState]

export type GetStateInput = {
    /** Optional target entrypoint, in case the submitter supports multiple entrypoints. */
    entryPoint?: Address
    /** Hash of the boop whose state to retrieve. */
    hash: Hash
}

export type GetStateOutput = GetStateReceipt | GetStateSimulated | GetStateUnknown | GetStateError

export type GetStateReceipt = {
    status: typeof GetState.Receipt
    receipt: BoopReceipt
}

export type GetStateSimulated = {
    status: typeof GetState.Simulated
    simulation: SimulateOutput
}

export type GetStateUnknown = {
    status: typeof GetState.UnknownBoop
}

export type GetStateError = {
    status: SubmitterErrorStatus
    description?: string
}
