// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

/**
 * Represents a Boop - a transaction made by a Happy Account that can be
 * submitted to the chain by a permissionless submitter.
 */
// forgefmt: disable-next-item
struct Boop {
    // Core Transaction Fields:
    address account;            // Account sending the transaction
    uint32 gasLimit;            // Gas limit for the transaction made by the submitter
    uint32 validateGasLimit;    // Gas limit for Account.validate
    uint32 executeGasLimit;     // Gas limit for Account.execute
    uint32 validatePaymentGasLimit; // Gas limit for Paymaster.validatePayment
    address dest;               // Destination address for the transaction
    address paymaster;          // Fee payer: This can be the
                                    // 1. account (if it implements Paymaster)
                                    // 2. external paymaster (implementing IPaymaster)
                                    // 3. 0x0...0, representing payment by a sponsoring submitter
    uint256 value;              // Amount of native tokens (in gas token wei) to transfer
    uint192 nonceTrack;         // The nonce track enables the submitter to know how to queue nonces
    uint64 nonceValue;          // The nonce sequence corresponding to the nonce track

    // Gas and Fee Parameters:
    uint256 maxFeePerGas;       // Maximum total fee per gas unit (inclusive basefee and priority fee)
    int256 submitterFee;        // Flat fee in gas token wei for submitter (can be negative for rebates)
                                    // - Submitter asks for this on top of payment of gas. This can be used to pay
                                    //   for extra costs (e.g. DA costs on rollups, server costs), and for profit
                                    // - Acts as rebate when negative (e.g. to refund part of the intrinsic transaction
                                    //   cost if the submitter batches multiple boops together), but in no case does
                                    //   this lead to the submitter transferring funds to accounts

    // Transaction Data:
    bytes callData;             // Transaction calldata to be executed

    // Payment and Validation:
    bytes paymasterData;        // Extra data passed to the paymaster
    bytes validatorData;        // Extra data for validation (e.g., signatures)
    bytes extraData;            // Reserved for future extensions and custom implementations
}

/**
 * This event exposes a Boop as an event and is emitted by {EntryPoint.submit}, for easier
 * indexing of Boops and easier visibility on block explorers.
 *
 * Note that we deliberately choose to separate all the fields into dedicated arguments instead of
 * having a single argument with the struct — this enables better display on some block explorers
 * like Blockscout.
 */
event BoopSubmitted(
    address account,
    uint32 gasLimit,
    uint32 validateGasLimit,
    uint32 executeGasLimit,
    uint32 validatePaymentGasLimit,
    address dest,
    address paymaster,
    uint256 value,
    uint192 nonceTrack,
    uint64 nonceValue,
    uint256 maxFeePerGas,
    int256 submitterFee,
    bytes callData,
    bytes paymasterData,
    bytes validatorData,
    bytes extraData
);
