import type { Hash } from "@happy.tech/common"
import type { StateRequestOutput } from "./BoopState"

export type { StateRequestOutput }
export type StateRequestInput = {
    hash: Hash
}

/**
 * GET `/api/v1/boop/state/{hash}`
 *
 * Returns the state of the Boop as known by the submitter.
 *
 * Depending on the submitter's state retention policies, he might not be able to answer this query,
 * even if he did see the Boop before. In this case he should answer with a status of
 * {@link StateRequestStatus.UnknownBoop}.
 */
export declare function submitter_state(input: StateRequestInput): StateRequestOutput
