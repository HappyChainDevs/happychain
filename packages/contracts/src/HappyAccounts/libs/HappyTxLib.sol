// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../HappyTx.sol";
import {MalformedHappyTx} from "../utils/HappyErrors.sol";

/**
 * @title  HappyTxLib
 * @dev    Library for encoding and decoding HappyTx structs using MUD-like encoding.
 *
 * Encoding Layout (total static size = 192 bytes):
 * [Static Fields - Slot 0: 32 bytes]
 * |-----------------account(20)---------------|-------dest-part1(12)---------|
 *
 * [Static Fields - Slot 1: 32 bytes]
 * |--------------paymaster(20)-------------|--dest-part2(8)--|--gasLimit(4)--|
 *
 * [Static Fields - Value Fields: 96 bytes]
 * |-------------------------------value(32)----------------------------------|
 * |-------------------------------nonce(32)----------------------------------|
 * |---------------------------maxFeePerGas(32)-------------------------------|
 * |---------------------------submitterFee(32)-------------------------------|
 *
 * [Dynamic Field Lengths + ExecGasLimit - 32 bytes]
 * |totalLen(8)|--len1(5)--|--len2(5)--|--len3(5)--|--len4(5)--|--execGasLimit(4)--|
 * totalLen: Total length of all dynamic data (uint8 for future-proofing)
 * len1: Length of callData
 * len2: Length of paymasterData
 * len3: Length of validatorData
 * len4: Length of extraData
 * execGasLimit: Execution gas limit (used only during execution phase)
 *
 * [Dynamic Fields]
 * [callData][paymasterData][validatorData][extraData]
 * Each dynamic field is tightly packed without padding
 */

/// @dev Maximum length for dynamic fields (2^40 - 1)
uint256 constant MAX_LENGTH = type(uint40).max;

/// @dev Represents the conversion constant from byte to bits.
uint256 constant BYTE_TO_BITS = 8;

/// @dev Represents the total byte length of an EVM word.
uint256 constant WORD_SIZE = 32;

/// @dev Represents the index of the last byte in an EVM word.
uint256 constant WORD_LAST_INDEX = 31;

/// @dev Represents the total length offset within the EVM word.
uint256 constant TOTAL_LENGTH = (WORD_SIZE - 2) * BYTE_TO_BITS;

library HappyTxLib {
    // Constants for dynamic field encoding
    uint256 private constant DYNAMIC_FIELDS = 4; // Number of dynamic fields in HappyTx
    uint256 private constant DYNAMIC_FIELD_LENGTH_BITS = 40; // Each length limited to 2^40
    uint256 private constant MASK_DYNAMIC_FIELD_LENGTH = (1 << 40) - 1;

    // Custom errors
    error InvalidEncodedLength();

    /*//////////////////////////////////////////////////////////////
                            EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Computes the hash of a pre-encoded HappyTx.
     * @param encodedHappyTx The pre-encoded transaction bytes
     * @return The hash of the encoded transaction
     */
    function getEncodedHappyTxHash(bytes calldata encodedHappyTx) external pure returns (bytes32) {
        return keccak256(encodedHappyTx);
    }

    /**
     * @notice Computes the hash of a HappyTx for signing.
     * @param happyTx The transaction to hash
     * @return The hash to sign
     */
    function getHappyTxHash(HappyTx memory happyTx) external pure returns (bytes32) {
        return keccak256(encode(happyTx));
    }

    /**
     * @dev Gets the account address from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return account The account address
     */
    function getAccount(bytes calldata happyTx) external pure returns (address account) {
        if (happyTx.length < 224) revert MalformedHappyTx();

        // First slot: account (20) + first 12 bytes of dest
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let ptr := add(happyTx.offset, 32)
            let slot1 := calldataload(ptr)
            account := shr(96, slot1)
        }
    }

    /**
     * @dev Gets the gas limit from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return gasLimit The gas limit for the transaction
     */
    function getGasLimit(bytes calldata happyTx) external pure returns (uint32 gasLimit) {
        if (happyTx.length < 224) revert MalformedHappyTx();

        // Second slot: paymaster (20) + last 8 bytes of dest + gasLimit (4)
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let ptr := add(happyTx.offset, 32)
            let slot2 := calldataload(add(ptr, 32))
            gasLimit := and(slot2, 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF)
        }
    }

    /**
     * @dev Gets the paymaster address from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return paymaster The paymaster address
     */
    function getPaymaster(bytes calldata happyTx) external pure returns (address paymaster) {
        if (happyTx.length < 224) revert MalformedHappyTx();

        // Second slot: paymaster (20) + last 8 bytes of dest + gasLimit (4)
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let ptr := add(happyTx.offset, 32)
            let slot2 := calldataload(add(ptr, 32))
            paymaster := shr(96, slot2)
        }
    }

    /**
     * @dev Gets the value from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return value The native token value in wei
     */
    function getValue(bytes calldata happyTx) external pure returns (uint256 value) {
        if (happyTx.length < 224) revert MalformedHappyTx();

        // Value is in slot 3
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let ptr := add(happyTx.offset, 32)
            value := calldataload(add(ptr, 64))
        }
    }

    /**
     * @dev Gets the execute gas limit from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return executeGasLimit The gas limit for the execute function
     */
    function getExecuteGasLimit(bytes calldata happyTx) external pure returns (uint32 executeGasLimit) {
        // Require minimum length for static fields + dynamic lengths word
        if (happyTx.length < 224) revert MalformedHappyTx();

        // The dynamic lengths word is at offset 192 (after static fields)
        bytes32 packedLengths;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            packedLengths := calldataload(add(happyTx.offset, 192))
        }

        return uint32(uint256(packedLengths) & ((1 << 32) - 1));
    }

    /**
     * @dev Gets the destination address from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return dest The destination address
     */
    function getDest(bytes calldata happyTx) external pure returns (address dest) {
        if (happyTx.length < 224) revert MalformedHappyTx();

        // solhint-disable-next-line no-inline-assembly
        assembly {
            let ptr := add(happyTx.offset, 32)
            let slot1 := calldataload(ptr) // First slot: account (20) + first 12 bytes of dest
            let slot2 := calldataload(add(ptr, 32)) // Second slot: paymaster (20) + last 8 bytes of dest + gasLimit (4)

            // Get first 12 bytes of dest by bit masking, then shift left by 20 bytes
            let destFirst12 := shl(160, and(slot1, 0x0000000000000000000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF))

            // Get last 8 bytes of dest by bit masking, then shift left by 8 bytes
            let destLast8 := shl(64, and(slot2, 0x0000000000000000000000000000000000000000FFFFFFFFFFFFFFFF00000000))

            // Combine dest parts (both parts are now in correct position, just OR them)
            dest := or(destFirst12, destLast8)
        }
    }

    /**
     * @dev Gets the nonce from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return nonce The account nonce
     */
    function getNonce(bytes calldata happyTx) external pure returns (uint256 nonce) {
        if (happyTx.length < 224) revert MalformedHappyTx();

        // solhint-disable-next-line no-inline-assembly
        assembly {
            let ptr := add(happyTx.offset, 32) // Nonce is in slot 4
            nonce := calldataload(add(ptr, 96)) // 96 = 32 * 3 (skip first 3 slots)
        }
    }

    /*//////////////////////////////////////////////////////////////
                            PUBLIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Encodes a HappyTx struct into bytes for hashing.
     * The encoding follows this format:
     * [static fields (192 bytes)][dynamic lengths (32 bytes)][dynamic data (varies)]
     * Each dynamic field is tightly packed without padding
     * @param happyTx The HappyTx struct to encode
     * @return result The encoded bytes
     */
    function encode(HappyTx memory happyTx) internal pure returns (bytes memory result) {
        uint256 dynamicDataLength = happyTx.callData.length + happyTx.paymasterData.length
            + happyTx.validatorData.length + happyTx.extraData.length;
        result = new bytes(192 + dynamicDataLength); // Total Len = static fields + dynamic fields
        uint256 dynamicPtr;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let ptr := result // Start directly at result
            dynamicPtr := add(result, 0xE0) // 192 (static fields) + 32 (encodedLengths) = 224 (0xE0)

            // Pack first slot: account (20) + first 12 bytes of dest
            let dest := mload(add(happyTx, 96)) // Load dest
            mstore(ptr, shl(96, mload(add(happyTx, 32)))) // account
            mstore(
                ptr,
                or(
                    mload(ptr), // keep existing content
                    shl(96, shr(64, dest)) // shift 12 bytes of dest to position 20-31
                )
            ) // first 12 bytes of dest

            // Pack second slot: paymaster (20) + remaining 8 bytes of dest + gasLimit (4)
            mstore(
                add(ptr, 32),
                or(
                    shl(96, mload(add(happyTx, 128))),
                    or(
                        shl(160, and(dest, 0x000000000000000000000000000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF)),
                        shl(
                            224,
                            and(
                                mload(add(happyTx, 64)),
                                0x00000000000000000000000000000000000000000000000000000000FFFFFFFF
                            )
                        )
                    )
                )
            )

            // Store value fields (32 bytes each)
            mstore(add(ptr, 64), mload(add(happyTx, 160))) // value
            mstore(add(ptr, 96), mload(add(happyTx, 192))) // nonce
            mstore(add(ptr, 128), mload(add(happyTx, 224))) // maxFeePerGas
            mstore(add(ptr, 160), mload(add(happyTx, 256))) // submitterFee
        }

        // Pack dynamic field lengths
        bytes32 packedLengths = _packLengths(
            happyTx.callData.length,
            happyTx.paymasterData.length,
            happyTx.validatorData.length,
            happyTx.extraData.length,
            happyTx.executeGasLimit
        );

        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Store packed lengths at offset 192
            mstore(add(result, 192), packedLengths)
        }

        // Pack dynamic fields directly to result after static fields
        _packDynamicFields(
            happyTx.callData, happyTx.paymasterData, happyTx.validatorData, happyTx.extraData, dynamicPtr
        );

        return result;
    }

    /**
     * @dev Decodes the tightly encoded happyTx.
     * @param happyTx The encoded happyTx bytes
     * @return result The decoded HappyTx struct
     *
     * Memory layout of HappyTx struct (each field gets full 32-byte slot):
     *
     * Slot 0  (0x00): account
     * Slot 1  (0x20): gasLimit
     * Slot 2  (0x40): executeGasLimit
     * Slot 3  (0x60): dest
     * Slot 4  (0x80): paymaster
     * Slot 5  (0xA0): value
     * Slot 6  (0xC0): nonce
     * Slot 7  (0xE0): maxFeePerGas
     * Slot 8  (0x100): submitterFee
     * Slot 9  (0x120): callData (ptr)
     * Slot 10 (0x140): paymasterData (ptr)
     * Slot 11 (0x160): validatorData (ptr)
     * Slot 12 (0x180): extraData (ptr)
     */
    function decode(bytes calldata happyTx) public pure returns (HappyTx memory result) {
        // First validate minimum length (192 static + 32 encoded dynamic lengths = 224 bytes)
        if (happyTx.length < 224) revert MalformedHappyTx();

        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Get pointer to the calldata bytes (skip first 32 bytes which is length)
            let ptr := add(happyTx.offset, 32)

            // First slot: account (20) + first 12 bytes of dest
            let slot1 := calldataload(ptr)
            mstore(result, shr(96, slot1)) // account at 0x00

            // Get first 12 bytes of dest by bit masking, then shift left by 20 bytes to get in correct position
            let destFirst12 := shl(160, and(slot1, 0x0000000000000000000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF))

            // Second slot: paymaster (20) + last 8 bytes of dest + gasLimit (4)
            let slot2 := calldataload(add(ptr, 32))
            mstore(add(result, 0x80), shr(96, slot2)) // paymaster at 0x80

            // Get last 8 bytes of dest by bit masking, then shift left by 8 bytes to get in correct position
            let destLast8 := shl(64, and(slot2, 0x0000000000000000000000000000000000000000FFFFFFFFFFFFFFFF00000000))

            // Combine dest parts (both parts are now in correct position, just OR them)
            let dest := or(destFirst12, destLast8)
            mstore(add(result, 0x60), dest) // dest at 0x60

            // Store gasLimit at 0x20
            mstore(
                add(result, 0x20),
                shl(224, and(slot2, 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF))
            )

            // Load remaining static fields directly into struct
            mstore(add(result, 0xA0), calldataload(add(ptr, 64))) // value at 0xA0 (slot 3)
            mstore(add(result, 0xC0), calldataload(add(ptr, 96))) // nonce at 0xC0 (slot 4)
            mstore(add(result, 0xE0), calldataload(add(ptr, 128))) // maxFeePerGas at 0xE0 (slot 5)
            mstore(add(result, 0x100), calldataload(add(ptr, 160))) // submitterFee at 0x100 (slot 6)
        }

        // Unpack lengths and validate
        (
            uint256 totalLength,
            uint256 callDataLength,
            uint256 paymasterDataLength,
            uint256 validatorDataLength,
            uint256 extraDataLength,
            uint32 executeGasLimit
        ) = _unpackLengths(bytes32(happyTx[192:224])); // Load encoded lengths from slot 7

        // Validate total length matches calldata
        if (happyTx.length != 224 + totalLength) revert MalformedHappyTx();

        // Store executeGasLimit
        result.executeGasLimit = executeGasLimit;

        // Extract dynamic fields using calldata slicing (more gas efficient than memory copies)
        uint256 dynamicOffset = 224; // Start after static fields + encoded lengths

        // Extract each dynamic field using the lengths we got from _unpackLengths
        result.callData = happyTx[dynamicOffset:dynamicOffset + callDataLength];
        if (result.callData.length != callDataLength) revert MalformedHappyTx();
        dynamicOffset += callDataLength;

        result.paymasterData = happyTx[dynamicOffset:dynamicOffset + paymasterDataLength];
        if (result.paymasterData.length != paymasterDataLength) revert MalformedHappyTx();
        dynamicOffset += paymasterDataLength;

        result.validatorData = happyTx[dynamicOffset:dynamicOffset + validatorDataLength];
        if (result.validatorData.length != validatorDataLength) revert MalformedHappyTx();
        dynamicOffset += validatorDataLength;

        result.extraData = happyTx[dynamicOffset:dynamicOffset + extraDataLength];
        if (result.extraData.length != extraDataLength) revert MalformedHappyTx();
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL VIEW/PURE HELPERS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Returns an overestimation of the gas consumed by a transaction
     * @param callGas The gas consumed by the function call
     * @param calldataLength The length of the calldata
     * @return The estimated total gas consumption including:
     *         - 21000 fixed intrinsic gas
     *         - Calldata gas cost assuming all non-zero bytes
     *         - Function call gas
     *         - Function dispatch overhead (TODO)
     */
    function txGasFromCallGas(uint256 callGas, uint256 calldataLength) internal pure returns (uint256) {
        return 21000 + (200 + calldataLength) * 16 + callGas; // + TODO;

        // - `21000` is the fixed of the intrinsic gas
        // - `(200 + calldataLength) * 16` is an overestimate of the calldata part of the
        //    intrinsic gas obtained by assuming every byte is non-zero in the tx data.
        //     - A transaction without calldata and access list is at most ~280 bytes
        //       but due to RLP encoding this should be lower. 200 is a good compromise,
        //       essentially since we already overcharge for the bytes whose value is 0.
        // - `callGas` is the gas consumed by the call.
        // - `TODO` is a constant overestimating the Solidity function dispatch
        //    overhead as well as the few opcodes not covered by a `gasLeft()`
        //    computation.
    }

    /**
     * @dev Tightly packs multiple dynamic byte arrays into raw memory.
     * The fields are packed in sequence without any padding, crossing word boundaries:
     * For example, if callData is 100 bytes (3 full words + 4 bytes):
     * Word1: [32 bytes of callData]
     * Word2: [32 bytes of callData]
     * Word3: [32 bytes of callData]
     * Word4: [4 bytes of callData][28 bytes of paymasterData]
     * Word5: [remaining 12 bytes of paymasterData][20 bytes of next field]
     * And so on...
     */
    function _packDynamicFields(
        bytes memory callData,
        bytes memory paymasterData,
        bytes memory validatorData,
        bytes memory extraData,
        uint256 writePtr
    ) internal pure {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let currentWordOffset := 0

            // Define function to pack a dynamic field with offset
            function packDynamicFieldWithOffset(dynamicField, currentPtr, wordOffset) -> newWritePtr, newOffset {
                let mask := 0xff00000000000000000000000000000000000000000000000000000000000000

                let fieldReadPtr := add(dynamicField, 32)
                let fieldRemaining := mload(dynamicField)
                newWritePtr := currentPtr
                newOffset := wordOffset

                // Process full words
                for {} gt(fieldRemaining, 32) { fieldRemaining := sub(fieldRemaining, 32) } {
                    let currentWord := mload(fieldReadPtr)

                    // First (32-offset) bytes go in current slot
                    mstore(
                        newWritePtr,
                        or(
                            mload(newWritePtr), // existing content
                            shr(mul(newOffset, 8), currentWord)
                        )
                    )
                    newWritePtr := add(newWritePtr, 32)

                    // Last 'offset' bytes go in next slot
                    mstore(newWritePtr, shl(mul(sub(32, newOffset), 8), currentWord))

                    fieldReadPtr := add(fieldReadPtr, 32)
                }

                // Handle remaining bytes (if any)
                if gt(fieldRemaining, 0) {
                    let currentWord := mload(newWritePtr)
                    let bytesProcessed := 0
                    let value := mload(fieldReadPtr)

                    for {} lt(bytesProcessed, fieldRemaining) { bytesProcessed := add(bytesProcessed, 1) } {
                        let maskedByte := and(value, mask)
                        let positionedByte := shr(mul(add(bytesProcessed, newOffset), 8), maskedByte)
                        currentWord := or(currentWord, positionedByte)
                        value := shl(8, value)
                    }
                    mstore(newWritePtr, currentWord)

                    // Update offset
                    newOffset := add(newOffset, fieldRemaining)
                    if gt(newOffset, 31) {
                        newWritePtr := add(newWritePtr, 32)
                        newOffset := mod(newOffset, 32)
                    }
                }
            }

            // Pack all dynamic fields starting with callData
            writePtr, currentWordOffset := packDynamicFieldWithOffset(callData, writePtr, currentWordOffset)
            writePtr, currentWordOffset := packDynamicFieldWithOffset(paymasterData, writePtr, currentWordOffset)
            writePtr, currentWordOffset := packDynamicFieldWithOffset(validatorData, writePtr, currentWordOffset)
            writePtr, currentWordOffset := packDynamicFieldWithOffset(extraData, writePtr, currentWordOffset)
        }
    }

    /**
     * @dev Utility function to pack dynamic field lengths into a single word.
     * Layout (32 bytes total):
     * |-totalLen(8)-|-dynamicLengths(20)-|-execGasLimit(4)-|
     * Most significant bits (left) to least significant bits (right)
     * @param callDataLength Length of callData field
     * @param paymasterDataLength Length of paymasterData field
     * @param validatorDataLength Length of validatorData field
     * @param extraDataLength Length of extraData field
     * @param execGasLimit Gas limit for execute function
     * @return Packed lengths in a single bytes32
     */
    function _packLengths(
        uint256 callDataLength,
        uint256 paymasterDataLength,
        uint256 validatorDataLength,
        uint256 extraDataLength,
        uint32 execGasLimit
    ) internal pure returns (bytes32) {
        // Validate all lengths are within 40 bits
        uint256 maxLengthValue = callDataLength | paymasterDataLength | validatorDataLength | extraDataLength;
        if (maxLengthValue > MAX_LENGTH) revert MalformedHappyTx();

        uint256 encodedLengths;
        unchecked {
            uint256 totalLen = callDataLength + paymasterDataLength + validatorDataLength + extraDataLength;

            // Pack from left to right (most significant to least significant)
            encodedLengths = totalLen << 192; // First 8 bytes (MSB)
            encodedLengths |= (callDataLength << 152); // 5 bytes after totalLen
            encodedLengths |= (paymasterDataLength << 112); // 5 bytes after len1
            encodedLengths |= (validatorDataLength << 72); // 5 bytes after len2
            encodedLengths |= (extraDataLength << 32); // 5 bytes after len3
            encodedLengths |= uint256(execGasLimit); // Last 4 bytes (LSB)
        }

        return bytes32(encodedLengths);
    }

    /**
     * @dev Utility function to unpack dynamic field lengths from a single word.
     * Layout (32 bytes total):
     * |-totalLen(8)-|-dynamicLengths(20)-|-execGasLimit(4)-|
     * Most significant bits (left) to least significant bits (right)
     * @param encodedLengths Packed lengths in a single bytes32
     * @return totalLength Total length of all dynamic fields combined
     * @return callDataLength Length of callData field
     * @return paymasterDataLength Length of paymasterData field
     * @return validatorDataLength Length of validatorData field
     * @return extraDataLength Length of extraData field
     * @return execGasLimit Gas limit for execute function
     */
    function _unpackLengths(bytes32 encodedLengths)
        internal
        pure
        returns (
            uint256 totalLength,
            uint256 callDataLength,
            uint256 paymasterDataLength,
            uint256 validatorDataLength,
            uint256 extraDataLength,
            uint32 execGasLimit
        )
    {
        unchecked {
            uint256 encoded = uint256(encodedLengths);
            totalLength = encoded >> 192;
            callDataLength = (encoded >> 152) & ((1 << 40) - 1);
            paymasterDataLength = (encoded >> 112) & ((1 << 40) - 1);
            validatorDataLength = (encoded >> 72) & ((1 << 40) - 1);
            extraDataLength = (encoded >> 32) & ((1 << 40) - 1);
            execGasLimit = uint32(encoded & ((1 << 32) - 1));

            // Validate all lengths are within 40 bits
            uint256 maxLengthValue = callDataLength | paymasterDataLength | validatorDataLength | extraDataLength;
            if (maxLengthValue > MAX_LENGTH) revert MalformedHappyTx();

            // Validate total length matches sum of individual lengths
            if (totalLength != callDataLength + paymasterDataLength + validatorDataLength + extraDataLength) {
                revert MalformedHappyTx();
            }
        }
    }
}
