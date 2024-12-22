// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

/**
 * @title HappyTx
 * @dev Represents a Happy Transaction - our equivalent of an ERC-4337 UserOperation,
 * optimized for low-latency use cases. This struct uses MUD's encoding scheme for
 * efficient calldata transmission (see: https://mud.dev/store/encoding#schema).
 *
 * Core Transaction Fields:
 * @param account             - The smart account initiating (sending) the transaction
 * @param dest                - The destination address for the transaction
 * @param value               - Amount of native tokens (in gas token wei) to transfer
 * @param callData            - The encoded function call data to be executed
 *
 * Nonce Management:
 * @param nonceTrack          - Identifier for parallel nonce tracking (default: 0). Enables concurrent
 *                              app usage by providing separate nonce spaces
 * @param nonce               - Sequential number within the track to prevent replay and ensure ordering
 *
 * Gas Parameters:
 * @param maxFeePerGas        - Maximum total fee per gas unit (base fee + priority fee)
 * @param gasLimit            - Maximum gas allowed for execute(encodedHappyTx) call
 *
 * Validation:
 * @param validator           - Address of the validation contract
 * @param validationData      - Arbitrary data for validation (e.g., signatures)
 *
 * Payment:
 * @param paymaster           - Address of the paymaster contract (0x0 for self-paying)
 * @param paymasterData       - Additional data for paymaster operations
 *
 * Extensions:
 * @param extraData           - Reserved for future extensions and custom implementations
 *
 * Memory Layout:
 * The struct is carefully arranged to optimize gas usage:
 * Slot 0: account (20 bytes) + nonceTrack (8 bytes) + gasLimit (4 bytes)
 * Slot 1: dest (20 bytes) + nonce (8 bytes) + padding
 * Slot 2: validator (20 bytes) + padding
 * Slot 3: paymaster (20 bytes) + padding
 * Following slots: value, maxFeePerGas, and dynamic bytes fields
 */
struct HappyTx {
    address account;
    uint64 nonceTrack;
    uint32 gasLimit;
    address dest;
    uint64 nonce;
    address validator;
    address paymaster;
    uint256 value;
    uint256 maxFeePerGas;
    bytes callData;
    bytes validationData;
    bytes paymasterData;
    bytes extraData;
}
