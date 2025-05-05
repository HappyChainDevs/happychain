import type { Hash } from "@happy.tech/common"
import type { SimulateOutput } from "#lib/handlers/simulate"
import type { BoopReceipt } from "#lib/types"
import type { Onchain, OnchainStatus } from "#lib/types"
import type { SubmitterErrorStatus } from "#lib/types"

export type StateRequestInput = {
    hash: Hash
}

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
    status: OnchainStatus | SubmitterErrorStatus

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
    status: typeof Onchain.Success
    included: true
    receipt: BoopReceipt
    simulation?: never
}

export type BoopState = BoopStateSubmitterError | BoopStateEntryPointError | BoopStateSuccess

/** Status result of a request for {@link BoopState}. */
export enum StateRequestStatus {
    /** The state request succeeded — this does not mean the state is available! */
    Success = "receiptSuccess",

    /** The boop is unknown to the submitter. */
    UnknownBoop = "receiptUnknownBoop",
}

/** Output of a request for {@link BoopState}. */
// biome-ignore format: readability
export type StateRequestOutput = StateRequestOutputSuccess | StateRequestOutputUnknown

export type StateRequestOutputSuccess = {
    status: StateRequestStatus.Success
    state: BoopState
}

export type StateRequestOutputUnknown = {
    status: StateRequestStatus.UnknownBoop
    state?: never
}
