// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

// ====================================================================================================
// ENTRYPOINT ENUMS

/// Represents the status of a call, used internally by the {EntryPoint.validate} function
enum CallStatus {
    SUCCEEDED, // The call succeeded.
    CALL_REVERTED, // The call reverted.
    EXECUTE_FAILED, // The {IAccount.execute} function failed (incorrect input).
    EXECUTE_REVERTED // The {IAccount.execute} function reverted (in violation of the spec).

}

/// Represents the validation result from account or paymaster validation calls, used internally by the {EntryPoint.validate} function
enum Validity {
    SUCCESS, // The validation call succeeded and returned a success status.
    CALL_REVERTED, // The validation call itself reverted (in violation of the spec).
    INVALID_RETURN_DATA, // The validation call returned malformed data (in violation of the spec).
    VALIDATION_FAILED, // The validation call succeeded but returned a failure status (e.g., invalid signature).
    UNKNOWN_DURING_SIMULATION // The validation result needs more data during simulation (e.g., missing gas limit).

}

/// Output structure returned by the {submit} function containing gas estimations and execution results
struct SubmitOutput {
    /**
     * An overestimation of the minimum gas limit necessary to successfully call {EntryPoint.submit}
     * at the top-level of a transaction.
     */
    uint32 gas;
    /**
     * An overestimation of the minimum gas limit necessary to successfully call
     * {IAccount.validate} from {EntryPoint.submit}.
     */
    uint32 validateGas;
    /**
     * An overestimation of the minimum gas limit necessary to successfully call
     * {IPaymaster.paymentValidateGas} from {EntryPoint.submit}.
     */
    uint32 paymentValidateGas;
    /**
     * An overestimation of the minimum gas limit necessary to successfully call
     * {IAccount.execute} from {EntryPoint.submit}.
     */
    uint32 executeGas;
    /**
     * If true, indicates that the account couldn't ascertain whether the validation was successful
     * in validation mode (e.g. it couldn't validate a signature because the simulation was used
     * to populate some of the fields that the signature signs over).
     */
    bool validityUnknownDuringSimulation;
    /**
     * If true, indicates that the paymaster couldn't ascertain whether the validation was
     * successful in validation mode (e.g. it couldn't validate a signature because the simulation
     * was used to populate some of the fields that the signature signs over).
     */
    bool paymentValidityUnknownDuringSimulation;
    /**
     * If true, indicates that while the simulation succeeded, the nonce is ahead of the current
     * nonce.
     */
    bool futureNonceDuringSimulation;
    /**
     * Status of the call specified by the boop.
     */
    CallStatus callStatus;
    /**
     * The revertData with which either the call or the {IAccount.execute} function reverted
     * (when the associated `callStatus` is set).
     */
    bytes revertData;
}
