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
     * This indicates either a dysfunctional account or a dysfunctional submitter.
     */
    ValidationReverted = "entrypointValidationReverted",

    /** The account validation of the HappyTx failed. */
    ValidationFailed = "entrypointValidationFailed",

    /**
     * The account's `execute` call reverted.
     * This indicates either a dysfunctional account or a dysfunctional submitter.
     */
    ExecuteReverted = "entrypointExecuteReverted",

    /**
     * The account's `execute` function returned indicate a failure. This is typically caused
     * by an incorrect input from the user.
     */
    ExecuteFailed = "entrypointExecuteFailed",

    /**
     * The call made by the account's `execute` function reverted.
     */
    CallReverted = "entrypointCallReverted",

    /**
     * The paymaster's `payout` call reverted.
     * This indicates either a dysfunctional paymaster or a dysfunctional submitter.
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

/** cf. {@link EntryPointStatus} */
export function isEntryPointStatus(status: string): status is EntryPointStatus {
    return status.startsWith("entrypoint")
}

// -------------------------------------------------------------------------------------------------

/**
 * Statuses indicating that either the entry point or one of the function it calls reverted, which
 * should never occur for correct account, paymaster and submitter implementations.
 */
export type EntryPointIllegalRevert =
    | EntryPointStatus.ValidationReverted
    | EntryPointStatus.ExecuteReverted
    | EntryPointStatus.PaymentReverted
    | EntryPointStatus.UnexpectedReverted

/** cf. {@link EntryPointIllegalRevert} */
export function isIllegalRevert(status: EntryPointStatus): status is EntryPointIllegalRevert {
    return status.endsWith("Reverted") && status !== EntryPointStatus.CallReverted
}

// -------------------------------------------------------------------------------------------------

/**
 * Statuses indicating rejected validation by the account or paymaster, or a failure to process the
 * fee payer's payment.
 */
export type EntryPointRejection =
    | EntryPointStatus.ValidationFailed
    | EntryPointStatus.ExecuteFailed
    | EntryPointStatus.PaymentFailed

/** cf. {@link EntryPointRejection} */
export function isRejection(status: EntryPointStatus): status is EntryPointRejection {
    return status.endsWith("Failed")
}

// -------------------------------------------------------------------------------------------------

/**
 * Status indicating that the submitter transaction reverted (either a non-execute illegal revert or a rejection).
 */
export type EntryPointRevertedTransaction =
    | EntryPointRejection
    | EntryPointStatus.ValidationReverted
    | EntryPointStatus.PaymentReverted
    | EntryPointStatus.UnexpectedReverted

/** cf. {@link EntryPointRevertedTransaction} */
export function isRevertedTransaction(status: EntryPointStatus): status is EntryPointRevertedTransaction {
    return (isIllegalRevert(status) && status !== EntryPointStatus.ExecuteReverted) || isRejection(status)
}

// -------------------------------------------------------------------------------------------------

/**
 * Possible outcomes of the validation of the HappyTx by the account during simulation.
 * This is distinct from {@link EntryPointStatus} because during simulation we have "successful"
 * statuses that need further checks ({@link SimulatedValidationStatus.Unknown} and {@link SimulatedValidationStatus.FutureNonce}).
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
     * Validation succeeded during simulation, but the nonce is ahead of the current nonce, and the
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
