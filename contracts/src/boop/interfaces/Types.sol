// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;
// ====================================================================================================
// BOOP

/**
 * Represents a boop - a "transaction" made by a Boop account that can be submitted to the chain by
 * a permissionless submitter. Each boop specifies a *call* to a destination address, which will
 * receive it with the Boop account as its msg.sender.
 */
// forgefmt: disable-next-item
struct Boop {
    address account;            // Account sending the boop
    uint32 gasLimit;            // Global gas limit (max gas the account will pay for)
    uint32 validateGasLimit;    // Gas limit for Account.validate
    uint32 executeGasLimit;     // Gas limit for Account.execute
    uint32 validatePaymentGasLimit; // Gas limit for Paymaster.validatePayment
    address dest;               // Destination address for call carried by the boop
    address paymaster;          // Fee payer: This can be the
                                //   1. account (if it implements Paymaster)
                                //   2. external paymaster (implementing IPaymaster)
                                //   3. 0x0...0, representing payment by a sponsoring submitter
    uint256 value;              // Amount of gas tokens (in wei) to transfer
    uint192 nonceTrack;         // Nonces are ordered within tracks, no ordering constraint across tracks
    uint64 nonceValue;          // The nonce sequence number within the nonce track

    uint256 maxFeePerGas;       // Maximum fee per gas unit paid by the payer
    int256 submitterFee;        // Flat fee in gas token wei for submitter (can be negative for rebates)
                                //   - Submitter asks for this on top of payment of gas. This can be used to pay
                                //     for extra costs (e.g. DA costs on rollups, server costs), or for profits.
                                //   - Acts as rebate when negative (e.g. to refund part of the intrinsic transaction
                                //     cost if the submitter batches multiple boops together), but in no case does
                                //     this lead to the submitter transferring funds to accounts.

    bytes callData;             // Call data for the call carried by the boop
    bytes paymasterData;        // Extra data passed to the paymaster
    bytes validatorData;        // Extra data for validation (e.g., signatures)
    bytes extraData;            // Extra dictionary-structured data for extensions
}

// ====================================================================================================
// STAKE (cf. {Staking})

/// Information about an address's stake in {Staking}.
struct Stake {
    /**
     * Staked balance, inclusive of the unlocked balance.
     */
    uint128 balance;
    /**
     * Balance available for withdrawal after the withdraw delay, starting from {withdrawtimestamp}.
     */
    uint128 unlockedBalance;
    /**
     * The withdraw delay is the time (in seconds) required to withdraw funds, i.e. the time
     * between {initiateWithdrawal} and {withdraw}). It is computed as:
     * `max(MIN_WITHDRAW_DELAY, minDelay, maxDelay - (block.timestamp - lastDecreaseTimestamp))`.
     * Invariant: `minDelay == maxDelay == 0 || MIN_WITHDRAW_DELAY <= minDelay <= maxDelay`
     */
    uint64 maxDelay;
    /**
     * cf. {maxDelay}
     */
    uint64 minDelay;
    /**
     * Earliest time at which them most recently initiated withdrawal can be executed, or 0 if all
     * withdrawals have been entirely processed.
     * Invariant: `(unlockedBalance > 0) ==> (withdrawalTimestamp > 0)`
     */
    uint64 withdrawalTimestamp;
    /**
     * Reference timestamp for computing the time elapsed since a decrease was initiated, or 0 if
     * no decreases have ever been made.
     *
     * Note that a decrease can inherit the reference timestamp of a previous decrease
     * to preserve the previous' decrease progress — therefore this might not match up with
     * the actual timestamp of the latest decrease operation.
     */
    uint64 lastDecreaseTimestamp;
}

// ====================================================================================================
// ENTRYPOINT TYPES

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

// ====================================================================================================
// IACCOUNT TYPES

/**
 * Output struct returned by {IAccount.execute}.
 * @param status      - Status of the execution (succeeded, failed, or call reverted)
 * @param revertData  - The associated revert data if the call specified by the boop reverts; otherwise, it is empty.
 */
struct ExecutionOutput {
    CallStatus status;
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
 * Information (destination, value and calldata) for a call to be made by the account on behalf
 * of an execution extension.
 */
struct CallInfo {
    address dest;
    uint256 value;
    bytes callData;
}
