import type { StateRequestOutput } from "./HappyTxState"
import type { Hash } from "./common_chain"

/**
 * GET /submitter_state/${hash}
 *
 * Returns the state of the HappyTx as known by the submitter.
 *
 * Depending on the submitter's state retentin policies, he might not be able to answer this query,
 * even if he did see the HappyTx before. In this case he should answer with a status of {@link
 * StateRequestStatus.UnknownHappyTx}.
 */
export declare function submitter_state(input: Hash): StateRequestOutput
