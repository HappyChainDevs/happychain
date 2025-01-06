// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../HappyTx.sol";
import {MalformedHappyTx} from "../utils/HappyErrors.sol";

/**
 * @title  HappyTxLib
 * @dev    Library for encoding and decoding HappyTx structs using MUD-like encoding.
 *
 * Encoding Layout (total static size = 160 bytes):
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
        (happyTx);
        // TODO: Implement decoding logic
        revert MalformedHappyTx();
    }

    /**
     * @dev Gets the gas limit from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return gasLimit The gas limit for the transaction
     */
    function getGasLimit(bytes calldata happyTx) external pure returns (uint32 gasLimit) {
        (happyTx);
        // TODO: Implement decoding logic
        revert MalformedHappyTx();
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
        
        return _unpackExecGasLimit(packedLengths);
    }

    /**
     * @dev Gets the destination address from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return dest The destination address
     */
    function getDest(bytes calldata happyTx) external pure returns (address dest) {
        (happyTx);
        // TODO: Implement decoding logic
        revert MalformedHappyTx();
    }

    /**
     * @dev Gets the paymaster address from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return paymaster The paymaster address
     */
    function getPaymaster(bytes calldata happyTx) external pure returns (address paymaster) {
        (happyTx);
        // TODO: Implement decoding logic
        revert MalformedHappyTx();
    }

    /**
     * @dev Gets the value from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return value The native token value in wei
     */
    function getValue(bytes calldata happyTx) external pure returns (uint256 value) {
        (happyTx);
        // TODO: Implement decoding logic
        revert MalformedHappyTx();
    }

    /**
     * @dev Gets the calldata from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return callData The transaction calldata
     */
    function getCallData(bytes calldata happyTx) external pure returns (bytes calldata callData) {
        (happyTx);
        // TODO: Implement decoding logic
        revert MalformedHappyTx();
    }

    /**
     * @dev Gets the nonce from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return nonce The account nonce
     */
    function getNonce(bytes calldata happyTx) external pure returns (uint256 nonce) {
        (happyTx);
        // TODO: Implement decoding logic
        revert MalformedHappyTx();
    }

    /**
     * @dev Gets the max fee per gas from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return maxFeePerGas The maximum fee per gas unit
     */
    function getMaxFeePerGas(bytes calldata happyTx) external pure returns (uint256 maxFeePerGas) {
        (happyTx);
        // TODO: Implement decoding logic
        revert MalformedHappyTx();
    }

    /**
     * @dev Gets the submitter fee from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return submitterFee The fee for the submitter (can be negative)
     */
    function getSubmitterFee(bytes calldata happyTx) external pure returns (int256 submitterFee) {
        (happyTx);
        // TODO: Implement decoding logic
        revert MalformedHappyTx();
    }

    /**
     * @dev Gets the paymaster data from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return paymasterData The extra data for the paymaster
     */
    function getPaymasterData(bytes calldata happyTx) external pure returns (bytes calldata paymasterData) {
        (happyTx);
        // TODO: Implement decoding logic
        revert MalformedHappyTx();
    }

    /**
     * @dev Gets the validator data from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return validatorData The validation data
     */
    function getValidatorData(bytes calldata happyTx) external pure returns (bytes calldata validatorData) {
        (happyTx);
        // TODO: Implement decoding logic
        revert MalformedHappyTx();
    }

    /**
     * @dev Gets the extra data from an encoded HappyTx
     * @param happyTx The encoded happy transaction bytes
     * @return extraData The extra data field
     */
    function getExtraData(bytes calldata happyTx) external pure returns (bytes calldata extraData) {
        (happyTx);
        // TODO: Implement decoding logic
        revert MalformedHappyTx();
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
     * @return The encoded bytes
     */
    function encode(HappyTx memory happyTx) public pure returns (bytes memory) {
        // Pre-calculate total size to avoid extra memory operations
        uint256 totalSize = 160 // Static fields (32 + 32 + 96)
            + happyTx.callData.length + happyTx.paymasterData.length + happyTx.validatorData.length
            + happyTx.extraData.length;

        bytes memory result = new bytes(totalSize);

        // solhint-disable-next-line no-inline-assembly
        assembly {
            let ptr := add(result, 32) // Skip length prefix

            // Pack first slot: account (20) + first 12 bytes of dest
            let dest := mload(add(happyTx, 96)) // Load dest
            mstore(ptr, shl(96, mload(add(happyTx, 32)))) // account
            mstore(add(ptr, 20), shr(64, dest)) // first 12 bytes of dest

            // Pack second slot: paymaster (20) + remaining 8 bytes of dest + gasLimit (4)
            mstore(add(ptr, 32), shl(96, mload(add(happyTx, 128)))) // paymaster
            mstore(add(ptr, 52), shl(32, and(dest, 0xFFFFFFFFFFFFFFFF))) // last 8 bytes of dest
            mstore(add(ptr, 60), mload(add(happyTx, 64))) // gasLimit

            // Store value fields (32 bytes each)
            mstore(add(ptr, 64), mload(add(happyTx, 160))) // value
            mstore(add(ptr, 96), mload(add(happyTx, 192))) // nonce
            mstore(add(ptr, 128), mload(add(happyTx, 224))) // maxFeePerGas
            mstore(add(ptr, 160), mload(add(happyTx, 256))) // submitterFee

            // Pack dynamic field lengths and execGasLimit into a single word
            let dynamicLengths := 0
            let callDataLength := mload(add(happyTx, 288)) // Length of callData
            let paymasterDataLength := mload(add(happyTx, 320)) // Length of paymasterData
            let validatorDataLength := mload(add(happyTx, 352)) // Length of validatorData
            let extraDataLength := mload(add(happyTx, 384)) // Length of extraData

            // Total length in first byte (uint8)
            let totalDynamicLength :=
                add(add(add(callDataLength, paymasterDataLength), validatorDataLength), extraDataLength)
            dynamicLengths := or(dynamicLengths, and(totalDynamicLength, 0xFF))

            // Pack individual lengths (5 bytes each) and execGasLimit
            dynamicLengths := or(dynamicLengths, shl(8, and(callDataLength, MASK_DYNAMIC_FIELD_LENGTH)))
            dynamicLengths := or(dynamicLengths, shl(48, and(paymasterDataLength, MASK_DYNAMIC_FIELD_LENGTH)))
            dynamicLengths := or(dynamicLengths, shl(88, and(validatorDataLength, MASK_DYNAMIC_FIELD_LENGTH)))
            dynamicLengths := or(dynamicLengths, shl(128, and(extraDataLength, MASK_DYNAMIC_FIELD_LENGTH)))
            dynamicLengths := or(dynamicLengths, shl(168, and(mload(add(happyTx, 416)), 0xFFFFFFFF))) // execGasLimit

            mstore(add(ptr, 192), dynamicLengths)

            // Copy dynamic data
            let dynamicPtr := add(ptr, 224)

            // Copy callData
            let srcPtr := add(mload(add(happyTx, 288)), 32) // Skip length word
            let size := callDataLength
            for { let i := 0 } lt(i, size) { i := add(i, 32) } { mstore(add(dynamicPtr, i), mload(add(srcPtr, i))) }
            dynamicPtr := add(dynamicPtr, size)

            // Copy paymasterData
            srcPtr := add(mload(add(happyTx, 320)), 32)
            size := paymasterDataLength
            for { let i := 0 } lt(i, size) { i := add(i, 32) } { mstore(add(dynamicPtr, i), mload(add(srcPtr, i))) }
            dynamicPtr := add(dynamicPtr, size)

            // Copy validatorData
            srcPtr := add(mload(add(happyTx, 352)), 32)
            size := validatorDataLength
            for { let i := 0 } lt(i, size) { i := add(i, 32) } { mstore(add(dynamicPtr, i), mload(add(srcPtr, i))) }
            dynamicPtr := add(dynamicPtr, size)

            // Copy extraData
            srcPtr := add(mload(add(happyTx, 384)), 32)
            size := extraDataLength
            for { let i := 0 } lt(i, size) { i := add(i, 32) } { mstore(add(dynamicPtr, i), mload(add(srcPtr, i))) }
        }

        return result;
    }

    /**
     * @dev Decodes the tightly encoded happyTx.
     * @param happyTx The encoded happyTx bytes
     * @return The decoded HappyTx struct
     */
    function decode(bytes memory happyTx) public pure returns (HappyTx memory) {
        (happyTx);
        // TODO: Implement decoding logic
        revert MalformedHappyTx();
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL FUNCTIONS
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

    /*//////////////////////////////////////////////////////////////
                        INTERNAL VIEW/PURE HELPERS
    //////////////////////////////////////////////////////////////*/

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
     * @dev Extract total length from packed bytes32
     * @param packedValue The packed bytes32 value
     * @return Total length (first 8 bytes)
     */
    function _unpackTotalLength(bytes32 packedValue) internal pure returns (uint256) {
        return uint256(packedValue) >> 192;
    }

    /**
     * @dev Extract callData length from packed bytes32
     * @param packedValue The packed bytes32 value
     * @return CallData length (5 bytes after totalLen)
     */
    function _unpackCallDataLength(bytes32 packedValue) internal pure returns (uint256) {
        return (uint256(packedValue) >> 152) & ((1 << 40) - 1);
    }

    /**
     * @dev Extract paymaster data length from packed bytes32
     * @param packedValue The packed bytes32 value
     * @return PaymasterData length (5 bytes after callDataLength)
     */
    function _unpackPaymasterDataLength(bytes32 packedValue) internal pure returns (uint256) {
        return (uint256(packedValue) >> 112) & ((1 << 40) - 1);
    }

    /**
     * @dev Extract validator data length from packed bytes32
     * @param packedValue The packed bytes32 value
     * @return ValidatorData length (5 bytes after paymasterDataLength)
     */
    function _unpackValidatorDataLength(bytes32 packedValue) internal pure returns (uint256) {
        return (uint256(packedValue) >> 72) & ((1 << 40) - 1);
    }

    /**
     * @dev Extract extra data length from packed bytes32
     * @param packedValue The packed bytes32 value
     * @return ExtraData length (5 bytes after validatorDataLength)
     */
    function _unpackExtraDataLength(bytes32 packedValue) internal pure returns (uint256) {
        return (uint256(packedValue) >> 32) & ((1 << 40) - 1);
    }

    /**
     * @dev Extract execution gas limit from packed bytes32
     * @param packedValue The packed bytes32 value
     * @return Execution gas limit (last 4 bytes)
     */
    function _unpackExecGasLimit(bytes32 packedValue) internal pure returns (uint32) {
        return uint32(uint256(packedValue) & ((1 << 32) - 1));
    }

    /**
     * @notice Computes a right-aligned byte mask based on the provided byte length.
     * @dev The mask is used to extract a specified number of rightmost bytes.
     *
     * @param byteLength The number of rightmost bytes to be masked.
     * @return mask A right-aligned byte mask corresponding to the specified byte length.
     */
    function _rightMask(uint256 byteLength) internal pure returns (uint256) {
        unchecked {
            return type(uint256).max >> (byteLength * BYTE_TO_BITS);
        }
    }
}
