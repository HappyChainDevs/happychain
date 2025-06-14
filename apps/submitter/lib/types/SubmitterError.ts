/**
 * Possible status pertaining to issues in the operation of the submitter (as opposed to onchain
 * simulation or onchain execution).
 */
export const SubmitterError = {
    /** Some values provided as input are invalid (e.g. gas limits, timeout). */
    InvalidValues: "submitterInvalidValues",

    /** A boop was submitted, but collides with a boop that is already currently being processed */
    AlreadyProcessing: "submitterAlreadyProcessing",

    /** The submitter rejected the request because of its Boop buffering policies. */
    BufferExceeded: "submitterBufferExceeded",

    /** The submitter rejected the request because it is over capacity. */
    OverCapacity: "submitterOverCapacity",

    /** The submitter failed with an unexpected error. */
    UnexpectedError: "submitterUnexpectedError",

    /** The RPC execution call (or related RPC call) timed out. */
    SubmitTimeout: "submitterSubmitTimeout",

    /** Error from the node's JSON-RPC server. */
    RpcError: "submitterRpcError",

    /** Unrecoverable client-side error. */
    ClientError: "submitterClientError",

    /**
     * Timed out while waiting for a receipt.
     * This could indicate that the submitter tx is stuck in the mempool or an RPC issue.
     */
    ReceiptTimeout: "submitterReceiptTimeout",

    /** The supplied nonce is too far ahead of the current nonce value. */
    NonceTooFarAhead: "submitterNonceTooFarAhead",

    /** The boop has been replaced by a newer boop. */
    BoopReplaced: "submitterBoopReplaced",

    /** Boop was submitted onchain by another submitter or entity. */
    ExternalSubmit: "submitterExternalSubmit",

    /**
     * The boop got rejected because the maxFeePerGas (either explicitly specified by the sender
     * or computed from the network) was higher than what the submitter was willing to accept.
     */
    GasPriceTooHigh: "submitterGasPriceTooHigh",

    /**
     * The boop was rejected because the provided submitter fee is too low.
     */
    SubmitterFeeTooLow: "submitterSubmitterFeeTooLow",
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
