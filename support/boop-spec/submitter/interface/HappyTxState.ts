import type { HappyTxReceipt } from "./HappyTxReceipt"
import type { SimulationResult } from "./SimulationResult"
import type {
    EntryPointStatus,
    SubmitterErrorSimulationMaybeAvailable,
    SubmitterErrorSimulationUnavailable,
} from "./status"

// -------------------------------------------------------------------------------------------------

/**
 * Describes the current state of a HappyTx that might or might not have
 * been included onchain yet.
 */
// biome-ignore format: readability
export type HappyTxState = {
    status: SubmitterErrorSimulationUnavailable
} | {
    status: EntryPointStatus | SubmitterErrorSimulationMaybeAvailable

    /** Whether the happyTx was included and executed onchain. */
    included: false

    /**
     * The result of simulation. Not guaranteed to be available, as a submitter does not have
     * to presimulate a tx before submitting, nor does he have to persist the simulation result.
     */
    simulation?: SimulationResult | undefined
} | {
    status: EntryPointStatus

    /** Whether the happyTx was included and executed onchain. */
    included: true

    receipt: HappyTxReceipt
}

// -------------------------------------------------------------------------------------------------

/** Status result of a request for {@link HappyTxState}. */
export enum StateRequestStatus {
    /** The state request succeeded — this does not mean the state is available! */
    Success = "receiptSuccess",

    /** The happyTx is unknown to the submitter. */
    UnknownHappyTx = "receiptUnknownHappyTx",
}

// -------------------------------------------------------------------------------------------------

/** Output of a request for {@link HappyTxState}. */
// biome-ignore format: readability
export type StateRequestOutput = {
    status: StateRequestStatus.Success
    state: HappyTxState
} | {
    status: StateRequestStatus.UnknownHappyTx
}

// -------------------------------------------------------------------------------------------------
