// -------------------------------------------------------------------------------------------------

/**
 * Possible status pertaining to issues in the operation of the submitter (as opposed to onchain
 * simulation or onchain execution).
 */
export enum SubmitterErrorStatus {
    /** The submitter rejected the request because of its Boop buffering policies. */
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
 * Possible outcomes of submitting the Boop to the onchain EntryPoint
 * contract, either during simulation or onchain execution.
 */
export enum EntryPointStatus {
    /** The Boop succeeded: the intended call was made without errors. */
    Success = "entrypointSuccess",

    /**
     * The account validation of the Boop reverted.
     * This indicates either a dysfunctional account or a dysfunctional submitter.
     */
    ValidationReverted = "entrypointValidationReverted",

    /** The account validation of the Boop failed. */
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
    PaymentValidationReverted = "entrypointPaymentValidationReverted",

    /**
     * When self-paying and the payment from the account fails, either because IAccount.payout
     * reverts, consumes too much gas, or does not transfer the full cost to the submitter.
     */
    PayoutFailed = "entrypointPayoutFailed",

    /**
     * Unexpected revert of the submission, most likely out-of-gas.
     */
    UnexpectedReverted = "entrypointUnexpectedReverted",
}

// -------------------------------------------------------------------------------------------------
/** cf. {@link EntryPointStatus} */
export function isEntryPointStatus(status: string): status is EntryPointStatus {
    return status.startsWith("entrypoint")
}

// -------------------------------------------------------------------------------------------------

/**
 * Statuses indicating that either the entry point or one of the function it calls reverted, which
 * should never occur for correct account, paymaster and submitter implementations.
 */
export function isRevert(
    status: EntryPointStatus,
): status is
    | EntryPointStatus.ValidationReverted
    | EntryPointStatus.ExecuteReverted
    | EntryPointStatus.PaymentValidationReverted
    | EntryPointStatus.UnexpectedReverted {
    return status.endsWith("Reverted")
}

// -------------------------------------------------------------------------------------------------

/** Whether the status indicates either a validation or payment failure. */
export function isFailure(
    status: EntryPointStatus,
): status is EntryPointStatus.ValidationFailed | EntryPointStatus.ExecuteFailed | EntryPointStatus.PayoutFailed {
    return status.endsWith("Failed")
}

// -------------------------------------------------------------------------------------------------

/**
 * Possible outcomes of the validation of the Boop by the account during simulation.
 * This is distinct from {@link EntryPointStatus} because during simulation we have "successful"
 * statuses that need further checks ({@link SimulatedValidationStatus.Unknown} and {@link SimulatedValidationStatus.FutureNonce}).
 */
export enum SimulatedValidationStatus {
    /** Validation succeeded during simulation. */
    Success = "simulationSuccess",

    ValidityUnknown = "simulationValidityUnknown",
    PaymentValidityUnknown = "simulationPaymentValidityUnknown",

    /**
     * Validation succeeded during simulation, but needs extra checks.
     *
     * e.g. use by validators that validators that check signature to enable simulation without a
     * signature, as the signing might need to cover gas values, and those need simulation to be
     * estimated.
     */
    Unknown = "simulationUnknown",

    /**
     * Validation succeeded during simulation, but the nonce is ahead of the current nonce, and the
     * Boop would thus fail if submitted onchain immediately.
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
