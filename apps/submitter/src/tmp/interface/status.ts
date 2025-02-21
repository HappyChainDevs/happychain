// -------------------------------------------------------------------------------------------------

/**
 * Possible status pertaining to issues in the operation of the submitter (as opposed to onchain
 * simulation or onchain execution).
 */
export enum SubmitterErrorStatus {
    /** The submitter rejected the request because of its HappyTx buffering policies. */
    BufferExceeded = "submitterBufferExceeded",

    /** The submitter rejected the request because it is over capacity. */
    OverCapacity = "submitterOverCapacity",

    /** The submitter failed with an unexpected error. */
    UnexpectedError = "submitterUnexpectedError",

    /** The RPC simulation call (or related RPC call) timed out. */
    SimulationTimeout = "submitterSimulationTimeout",

    /** The RPC execution call (or related RPC call) timed out. */
    SubmitTimeout = "submitterSubmitTimeout",

    /**
     * Timed out while waiting for a receipt.
     * This could indicate that the submitter tx is stuck in the mempool or an RPC issue.
     */
    ReceiptTimeout = "submitterReceiptTimeout",
}

// -------------------------------------------------------------------------------------------------

export function isSubmitterError(status: string): status is SubmitterErrorStatus {
    return status.startsWith("submitter")
}

// -------------------------------------------------------------------------------------------------

export type SubmitterErrorSimulationUnavailable =
    | SubmitterErrorStatus.BufferExceeded
    | SubmitterErrorStatus.OverCapacity
    | SubmitterErrorStatus.UnexpectedError
    | SubmitterErrorStatus.SimulationTimeout

export type SubmitterErrorSimulationMaybeAvailable =
    | SubmitterErrorStatus.SubmitTimeout
    | SubmitterErrorStatus.ReceiptTimeout

// -------------------------------------------------------------------------------------------------

/**
 * Possible outcomes of submitting the HappyTx to the onchain EntryPoint
 * contract, either during simulation or onchain execution.
 */
export enum EntryPointStatus {
    /** The HappyTx succeeded: the intended call was made without errors. */
    Success = "entrypointSuccess",

    /**
     * The account validation of the HappyTx reverted.
     * This indicates either a disfunctional account or a disfunctional submitter.
     */
    ValidationReverted = "entrypointValidationReverted",

    /** The account validation of the HappyTx failed. */
    ValidationFailed = "entrypointValidationFailed",

    /**
     * The account's `execute` call reverted.
     * This indicates either a disfunctional account or a disfunctional submitter.
     */
    ExecuteReverted = "entrypointExecuteReverted",

    /**
     * The account's `execute` call failed.
     */
    ExecuteFailed = "entrypointExecuteFailed",

    /**
     * The paymaster's `payout` call reverted.
     * This indicates either a disfunctional paymaster or a disfunctional submitter.
     */
    PaymentReverted = "entrypointPaymentReverted",

    /**
     * Either the paymaster rejected the payout request, or the payment failed
     * (no or not enough funds were transferred).
     */
    PaymentFailed = "entrypointPaymentFailed",

    /**
     * Unexpected revert of the submission, most likely out-of-gas.
     */
    UnexpectedReverted = "entrypointUnexpectedReverted",
}

// -------------------------------------------------------------------------------------------------

export function isEntryPointStatus(status: string): status is EntryPointStatus {
    return status.startsWith("entrypoint")
}

// -------------------------------------------------------------------------------------------------

/**
 * Whether the status indicates a revert, which should never occur for correct account, paymaster
 * and submitter implementations.
 */
export function isRevert(
    status: EntryPointStatus,
): status is
    | EntryPointStatus.ValidationReverted
    | EntryPointStatus.ExecuteReverted
    | EntryPointStatus.PaymentReverted
    | EntryPointStatus.UnexpectedReverted {
    return status.endsWith("Reverted")
}

// -------------------------------------------------------------------------------------------------

/** Whether the status indicates either a validation or payment failure. */
export function isFailure(
    status: EntryPointStatus,
): status is EntryPointStatus.ValidationFailed | EntryPointStatus.ExecuteFailed | EntryPointStatus.PaymentFailed {
    return status.endsWith("Failed")
}

// -------------------------------------------------------------------------------------------------

/**
 * Possible outcomes of the validation of the HappyTx by the account during simulation.
 * This is distinct from {@link EntryPointStatus} because during simulation we have "successful"
 * statuses that need further checks ({@link Unknown} and {@link FutureNonce}).
 */
export enum SimulatedValidationStatus {
    /** Validation succeded during simulation. */
    Success = "simulationSuccess",

    /**
     * Validation suceeded during simulation, but needs extra checks.
     *
     * e.g. use by validators that validators that check signature to enable simulation without a
     * signature, as the signing might need to cover gas values, and those need simulation to be
     * estimated.
     */
    Unknown = "simulationUnknown",

    /**
     * Validation suceeded during simulation, but the nonce is ahead of the current nonce, and the
     * HappyTx would thus fail if submitted onchain immediately.
     */
    FutureNonce = "simulationFutureNonce",

    /**
     * The validation reverted during simulation, indicating either a faulty account or a faulty
     * submitter.
     */
    Reverted = "simulationReverted",

    /** Validation failed during simulation. */
    Failed = "simulationFailed",

    /**
     * The simulation reverted for an unexpected reason, preventing us from retrieving the
     * validation outcome.
     */
    UnexpectedReverted = "simulationUnexpectedReverted",
}

// -------------------------------------------------------------------------------------------------
