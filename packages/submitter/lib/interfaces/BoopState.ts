import type { Prettify } from "@happy.tech/common"
import type { SimulateOutput } from "#lib/interfaces/boop_simulate"
import type { BoopReceipt } from "./BoopReceipt"
import type { EntryPointStatus, SubmitterErrorStatus } from "./status"

// -------------------------------------------------------------------------------------------------

/**
 * Describes the current state of a Boop that might or might not have
 * been included onchain yet.
 */
// biome-ignore format: readability
export type BoopStateSubmitterError = {
    status: SubmitterErrorStatus
    included?: never,
    receipt?: never
    simulation?: never
}
export type BoopStateEntryPointError = {
    status: EntryPointStatus | SubmitterErrorStatus

    /** Whether the Boop was included and executed onchain. */
    included: false

    receipt?: never
    /**
     * The result of simulation. Not guaranteed to be available, as a submitter does not have
     * to presimulate a tx before submitting, nor does he have to persist the simulation result.
     */
    simulation?: SimulateOutput | undefined
}

export type BoopStateSuccess = {
    status: EntryPointStatus.Success
    included: true
    receipt: BoopReceipt
    simulation?: never
}

export type BoopState = Prettify<BoopStateSubmitterError | BoopStateEntryPointError | BoopStateSuccess>

// -------------------------------------------------------------------------------------------------

/** Status result of a request for {@link BoopState}. */
export enum StateRequestStatus {
    /** The state request succeeded — this does not mean the state is available! */
    Success = "receiptSuccess",

    /** The boop is unknown to the submitter. */
    UnknownBoop = "receiptUnknownBoop",
}

// -------------------------------------------------------------------------------------------------

/** Output of a request for {@link BoopState}. */
// biome-ignore format: readability
export type StateRequestOutput = {
    status: StateRequestStatus.Success
    state: BoopState
} | {
    status: StateRequestStatus.UnknownBoop
    state?: never
}

// -------------------------------------------------------------------------------------------------
