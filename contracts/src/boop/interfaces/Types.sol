// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

// ====================================================================================================
// BOOP

/**
 * Represents a boop - a "transaction" made by a Boop account that can be submitted to the chain by
 * a permissionless submitter. Each boop specifies a call to a destination address, which will
 * receive it with the Boop account as its `msg.sender`.
 */
// forgefmt: disable-next-item
struct Boop {
    address account;            // Account initiating the boop
    address dest;               // Destination address for the call carried by the boop
    address payer;              // Fee payer. This can be:
                                //   1. the account (if it's a self-paying transaction)
                                //   2. an external paymaster contract (implementing {interfaces/IPaymaster})
                                //   3. 0x0...0: payment by a sponsoring submitter
    
    uint256 value;              // Amount of gas tokens (in wei) to transfer
    uint192 nonceTrack;         // Nonces are ordered within tracks; there is no ordering constraint across tracks
    uint64 nonceValue;          // Nonce sequence number within the nonce track


    uint256 maxFeePerGas;       // Maximum fee per gas unit paid by the payer
    int256 submitterFee;        // Flat fee in gas token wei for the submitter (can be negative for rebates)
                                //   - The submitter requests this on top of gas payment. This can be used to cover
                                //     extra costs (e.g., DA costs on rollups, server costs), or as profit.
                                //   - Acts as a rebate when negative (e.g., to refund part of the intrinsic transaction
                                //     cost if the submitter batches multiple boops together). In no case does this
                                //     lead to the submitter transferring funds to accounts.

    uint32 gasLimit;            // Global gas limit (maximum gas the account will pay for)
    uint32 validateGasLimit;    // Gas limit for {interfaces/IAccount.validate}
    uint32 validatePaymentGasLimit; // Gas limit for {interfaces/IPaymaster.validatePayment}
    uint32 executeGasLimit;     // Gas limit for {interfaces/IAccount.execute}

    bytes callData;             // Call data for the call carried by the boop
    bytes validatorData;        // Extra data for validation (e.g., signatures)
    bytes extraData;            // Extra dictionary-structured data for extensions
}

// ====================================================================================================
// ENTRYPOINT TYPES

/**
 * Represents the status of the call specified by a boop.
 */
// forgefmt: disable-next-item
enum CallStatus {
    /** The call succeeded. */
    SUCCEEDED,
    /** The call reverted. */
    CALL_REVERTED,
    /** The {IAccount.execute} function rejected the boop (incorrect input). */
    EXECUTE_REJECTED,
    /** The {IAccount.execute} function reverted (in violation of the spec). */
    EXECUTE_REVERTED
}

/**
 * Represents the validation result from account or paymaster validation calls, used internally by
 * the {core/EntryPoint.validate} function.
 */
// forgefmt: disable-next-item
enum Validity {
    /** The validation call succeeded. */
    SUCCESS,
    /** The validation call itself reverted (in violation of the spec). */
    CALL_REVERTED,
    /** The validation call returned malformed data (in violation of the spec). */
    INVALID_RETURN_DATA,
    /** The validation call succeeded but returned rejection data (e.g., invalid signature). */
    VALIDATION_REJECTED,
    /**
     * Only in simulation mode: The validation call succeeded, but indicated that some needed
     * information is unavailable at simulation time (e.g., signature).
     */
    UNKNOWN_DURING_SIMULATION
}

/**
 * Output structure returned by the {core/EntryPoint.submit} function containing gas estimations and execution
 * results.
 */
struct EntryPointOutput {
    /**
     * An overestimation of the minimum gas limit necessary to successfully call {core/EntryPoint.submit}
     * at the top-level of a transaction.
     */
    uint32 gas;
    /**
     * An overestimation of the minimum gas limit necessary to successfully call
     * {interfaces/IAccount.validate} from {core/EntryPoint.submit}.
     */
    uint32 validateGas;
    /**
     * An overestimation of the minimum gas limit necessary to successfully call
     * {interfaces/IPaymaster.validatePayment} from {core/EntryPoint.submit}.
     */
    uint32 validatePaymentGas;
    /**
     * An overestimation of the minimum gas limit necessary to successfully call
     * {interfaces/IAccount.execute} from {core/EntryPoint.submit}.
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
     * Depending on {callstatus}: the revertData with which either the call or the
     * {interfaces/IAccount.execute} function reverted, or the rejection reason (encoded error) returned by
     * {interfaces/IAccount.execute}.
     */
    bytes revertData;
}

// ====================================================================================================
// ACCOUNT TYPES

/**
 * Output struct returned by {interfaces/IAccount.execute}.
 */
struct ExecutionOutput {
    CallStatus status;
    /**
     * The associated revert data if the call specified by the boop reverts (with
     * {CallStatus.CALL_REVERTED}), or the rejection reason if {interfaces/IAccount.execute} rejects the boop
     * (with {CallStatus.EXECUTE_REJECTED}). Otherwise, this is empty.
     */
    bytes revertData;
}

// ====================================================================================================
// EXTENSIONS TYPES

/**
 * Possible types of extensions.
 */
enum ExtensionType {
    Validator,
    Executor
}

/**
 * Information (destination, value, and callData) for a call to be made by the account on behalf
 * of an execution extension.
 */
struct CallInfo {
    address dest;
    uint256 value;
    bytes callData;
}
