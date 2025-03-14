// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

/**
 * @notice Represents a Happy Transaction - a transaction made by a Happy Smart Account
 *         that can be submitted to the chain by a permissionless submitter.
 * The struct is arranged to optimize gas usage by ensuring efficient packing in storage.
 *
 * Slot 0:  |-pad(4)-|-execGasLimit(4)-|-gasLimit(4)-|-----------account(20)------------|
 * Slot 1:  |--------------pad(12)---------------|-------------dest(20)-----------------|
 * Slot 2:  |--------------pad(12)---------------|------------paymaster(20)-------------|
 * Slot 3:  |--------------------------------value(32)----------------------------------|
 * Slot 4:  |-------------------nonceValue(24)------------------|-----nonceTrack(8)-----|
 * Slot 5:  |----------------------------maxFeePerGas(32)-------------------------------|
 * Slot 6:  |----------------------------submitterFee(32)-------------------------------|
 * Slot 7+: |  Dynamic length fields (callData, paymasterData, validatorData, extraData) |
 */

// forgefmt: disable-next-item
struct HappyTx {
    // Core Transaction Fields:
    address account;            // Account sending the transaction
    uint32 gasLimit;            // Gas limit for the transaction made by the submitter
    uint32 executeGasLimit;     // Gas limit for the IHappyAccount.execute function
    address dest;               // Destination address for the transaction
    address paymaster;          // Fee payer: This can be the
                                    // 1. account (if it implements IHappyPaymaster)
                                    // 2. external paymaster (implementing IHappyPaymaster)
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
                                    //   cost if the submitter batches multiple happyTxs together), but in no case does
                                    //   this lead to the submitter transferring funds to accounts

    // Transaction Data:
    bytes callData;             // Transaction calldata to be executed

    // Payment and Validation:
    bytes paymasterData;        // Extra data passed to the paymaster
    bytes validatorData;        // Extra data for validation (e.g., signatures)
    bytes extraData;            // Reserved for future extensions and custom implementations
}
