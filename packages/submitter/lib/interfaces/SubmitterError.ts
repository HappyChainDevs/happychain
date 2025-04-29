// -------------------------------------------------------------------------------------------------

/**
 * Possible status pertaining to issues in the operation of the submitter (as opposed to onchain
 * simulation or onchain execution).
 */
export const SubmitterError = {
    /** The submitter rejected the request because of its Boop buffering policies. */
    BufferExceeded: "submitterBufferExceeded",

    /** The submitter rejected the request because it is over capacity. */
    OverCapacity: "submitterOverCapacity",

    /** The submitter failed with an unexpected error. */
    UnexpectedError: "submitterUnexpectedError",

    /** The RPC simulation call (or related RPC call) timed out. */
    SimulationTimeout: "submitterSimulationTimeout",

    /** The RPC execution call (or related RPC call) timed out. */
    SubmitTimeout: "submitterSubmitTimeout",

    /** Error from the node's JSON-RPC server. */
    RpcError: "submitterRpcError",

    /**
     * Timed out while waiting for a receipt.
     * This could indicate that the submitter tx is stuck in the mempool or an RPC issue.
     */
    ReceiptTimeout: "submitterReceiptTimeout",
} as const

/**
 * @inheritDoc SubmitterError
 * cf. {@link SubmitterError}
 */
export type SubmitterErrorStatus = (typeof SubmitterError)[keyof typeof SubmitterError]

/**
 * Checks is a status string is a {@link SubmitterErrorStatus}.
 */
export function isSubmitterError(status: string): status is SubmitterErrorStatus {
    return status.startsWith("submitter")
}
