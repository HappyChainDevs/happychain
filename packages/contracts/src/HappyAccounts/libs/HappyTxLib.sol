// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../HappyTx.sol";

/**
 * @title  HappyTxLib
 * @dev    Library for encoding and decoding HappyTx structs using MUD-like encoding.
 */
library HappyTxLib {
    // Constants for dynamic field encoding
    uint256 private constant DYNAMIC_FIELDS = 4; // Number of dynamic fields in HappyTx
    uint256 private constant DYNAMIC_FIELD_LENGTH_BITS = 40; // Each length limited to 2^40
    uint256 private constant MASK_DYNAMIC_FIELD_LENGTH = (1 << 40) - 1;

    // Custom errors
    error InvalidEncodedLength();

    /**
     * @dev Computes the hash of a HappyTx for signing
     * @param happyTx The transaction to hash
     * @return The hash to sign
     */
    function getHappyTxHash(HappyTx memory happyTx) internal pure returns (bytes32) {
        return keccak256(encode(happyTx));
    }

    function getHappyTxHashfromCalldata(HappyTx calldata happyTx) internal pure returns (bytes32) {
        return keccak256(encode(happyTx));
    }

    /**
     * @dev Encodes a HappyTx struct into bytes using efficient encoding
     * @param happyTx The HappyTx struct to encode
     * @return The encoded bytes
     */
    function encode(HappyTx memory happyTx) internal pure returns (bytes memory) {
        // Pre-calculate total size to avoid extra memory operations
        uint256 totalSize = 196 // 164 (static fields) + 32 (dynamic lengths)
            + happyTx.callData.length + happyTx.validationData.length + happyTx.paymasterData.length
            + happyTx.extraData.length;

        bytes memory result = new bytes(totalSize);

        // solhint-disable-next-line no-inline-assembly
        assembly {
            let ptr := add(result, 32) // Skip length prefix

            // Pack first word: account (20) + nonceTrack (8) + gasLimit (4)
            mstore(ptr, shl(96, mload(add(happyTx, 32)))) // account
            mstore(add(ptr, 20), shl(32, mload(add(happyTx, 64)))) // nonceTrack
            mstore(add(ptr, 28), mload(add(happyTx, 96))) // gasLimit

            // Pack second word: dest (20) + nonce (8) + padding
            mstore(add(ptr, 32), shl(96, mload(add(happyTx, 128)))) // dest
            mstore(add(ptr, 52), mload(add(happyTx, 160))) // nonce

            // Store validator (20)
            mstore(add(ptr, 64), shl(96, mload(add(happyTx, 192)))) // validator

            // Store paymaster (20)
            mstore(add(ptr, 84), shl(96, mload(add(happyTx, 224)))) // paymaster

            // Store value (32)
            mstore(add(ptr, 104), mload(add(happyTx, 256))) // value

            // Store maxFeePerGas (32)
            mstore(add(ptr, 136), mload(add(happyTx, 288))) // maxFeePerGas

            // Store dynamic field lengths in a single word
            let dynamicLengths := 0
            let callDataLength := mload(add(happyTx, 320)) // Length of callData
            let validationDataLength := mload(add(happyTx, 352)) // Length of validationData
            let paymasterDataLength := mload(add(happyTx, 384)) // Length of paymasterData
            let extraDataLength := mload(add(happyTx, 416)) // Length of extraData

            dynamicLengths := or(dynamicLengths, callDataLength)
            dynamicLengths := or(dynamicLengths, shl(DYNAMIC_FIELD_LENGTH_BITS, validationDataLength))
            dynamicLengths := or(dynamicLengths, shl(mul(DYNAMIC_FIELD_LENGTH_BITS, 2), paymasterDataLength))
            dynamicLengths := or(dynamicLengths, shl(mul(DYNAMIC_FIELD_LENGTH_BITS, 3), extraDataLength))

            mstore(add(ptr, 168), dynamicLengths)

            // Copy dynamic data
            let dynamicPtr := add(ptr, 200)

            // Copy callData
            let srcPtr := add(mload(add(happyTx, 320)), 32) // Skip length word
            let size := callDataLength
            for { let i := 0 } lt(i, size) { i := add(i, 32) } { mstore(add(dynamicPtr, i), mload(add(srcPtr, i))) }
            dynamicPtr := add(dynamicPtr, size)

            // Copy validationData
            srcPtr := add(mload(add(happyTx, 352)), 32)
            size := validationDataLength
            for { let i := 0 } lt(i, size) { i := add(i, 32) } { mstore(add(dynamicPtr, i), mload(add(srcPtr, i))) }
            dynamicPtr := add(dynamicPtr, size)

            // Copy paymasterData
            srcPtr := add(mload(add(happyTx, 384)), 32)
            size := paymasterDataLength
            for { let i := 0 } lt(i, size) { i := add(i, 32) } { mstore(add(dynamicPtr, i), mload(add(srcPtr, i))) }
            dynamicPtr := add(dynamicPtr, size)

            // Copy extraData
            srcPtr := add(mload(add(happyTx, 416)), 32)
            size := extraDataLength
            for { let i := 0 } lt(i, size) { i := add(i, 32) } { mstore(add(dynamicPtr, i), mload(add(srcPtr, i))) }
        }

        return result;
    }

    /**
     * @dev Decodes bytes into a HappyTx struct
     * @param encoded The bytes to decode
     * @return happyTx The decoded HappyTx struct
     */
    function decode(bytes calldata encoded) internal pure returns (HappyTx memory happyTx) {
        if (encoded.length < 196) revert InvalidEncodedLength();

        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Allocate memory for HappyTx struct
            happyTx := mload(0x40)
            mstore(0x40, add(happyTx, 0x280)) // 640 bytes for the struct (13 fields * 32 bytes + padding)

            let ptr := add(encoded.offset, 32)

            // Decode static fields
            mstore(add(happyTx, 32), shr(96, mload(ptr))) // account
            mstore(add(happyTx, 64), shr(32, mload(add(ptr, 20)))) // nonceTrack
            mstore(add(happyTx, 96), mload(add(ptr, 28))) // gasLimit

            mstore(add(happyTx, 128), shr(96, mload(add(ptr, 32)))) // dest
            mstore(add(happyTx, 160), mload(add(ptr, 52))) // nonce

            mstore(add(happyTx, 192), shr(96, mload(add(ptr, 64)))) // validator
            mstore(add(happyTx, 224), shr(96, mload(add(ptr, 84)))) // paymaster

            mstore(add(happyTx, 256), mload(add(ptr, 104))) // value
            mstore(add(happyTx, 288), mload(add(ptr, 136))) // maxFeePerGas

            // Decode dynamic field lengths
            let dynamicLengths := mload(add(ptr, 168))
            let callDataLength := and(dynamicLengths, MASK_DYNAMIC_FIELD_LENGTH)
            let validationDataLength := and(shr(DYNAMIC_FIELD_LENGTH_BITS, dynamicLengths), MASK_DYNAMIC_FIELD_LENGTH)
            let paymasterDataLength :=
                and(shr(mul(DYNAMIC_FIELD_LENGTH_BITS, 2), dynamicLengths), MASK_DYNAMIC_FIELD_LENGTH) //solhint-disable-line max-line-length
            let extraDataLength :=
                and(shr(mul(DYNAMIC_FIELD_LENGTH_BITS, 3), dynamicLengths), MASK_DYNAMIC_FIELD_LENGTH) //solhint-disable-line max-line-length

            // Allocate and copy dynamic fields
            let dynamicPtr := add(ptr, 200)

            // Copy callData
            let dataPtr := mload(0x40)
            mstore(0x40, add(dataPtr, add(64, callDataLength)))
            mstore(add(happyTx, 320), dataPtr)
            mstore(dataPtr, callDataLength)
            dataPtr := add(dataPtr, 32)
            calldatacopy(dataPtr, dynamicPtr, callDataLength)
            dynamicPtr := add(dynamicPtr, callDataLength)

            // Copy validationData
            dataPtr := mload(0x40)
            mstore(0x40, add(dataPtr, add(64, validationDataLength)))
            mstore(add(happyTx, 352), dataPtr)
            mstore(dataPtr, validationDataLength)
            dataPtr := add(dataPtr, 32)
            calldatacopy(dataPtr, dynamicPtr, validationDataLength)
            dynamicPtr := add(dynamicPtr, validationDataLength)

            // Copy paymasterData
            dataPtr := mload(0x40)
            mstore(0x40, add(dataPtr, add(64, paymasterDataLength)))
            mstore(add(happyTx, 384), dataPtr)
            mstore(dataPtr, paymasterDataLength)
            dataPtr := add(dataPtr, 32)
            calldatacopy(dataPtr, dynamicPtr, paymasterDataLength)
            dynamicPtr := add(dynamicPtr, paymasterDataLength)

            // Copy extraData
            dataPtr := mload(0x40)
            mstore(0x40, add(dataPtr, add(64, extraDataLength)))
            mstore(add(happyTx, 416), dataPtr)
            mstore(dataPtr, extraDataLength)
            dataPtr := add(dataPtr, 32)
            calldatacopy(dataPtr, dynamicPtr, extraDataLength)
        }
    }

    /**
     * @dev Encodes a HappyTx struct from calldata into bytes
     * @param happyTx The HappyTx struct in calldata
     * @return The encoded bytes
     */
    function encodeFromCalldata(HappyTx calldata happyTx) internal pure returns (bytes memory) {
        // Pre-calculate total size to avoid extra memory operations
        uint256 totalSize = 196 // 164 (static fields) + 32 (dynamic lengths)
            + happyTx.callData.length + happyTx.validationData.length + happyTx.paymasterData.length
            + happyTx.extraData.length;

        bytes memory result = new bytes(totalSize);

        // solhint-disable-next-line no-inline-assembly
        assembly {
            let ptr := add(result, 32) // Skip length prefix

            // Get the start of calldata struct
            let happyTxDataStart := sub(calldatasize(), sub(calldatasize(), happyTx))

            // Pack first word: account (20) + nonceTrack (8) + gasLimit (4)
            mstore(ptr, shl(96, calldataload(happyTxDataStart))) // account
            mstore(add(ptr, 20), shl(32, calldataload(add(happyTxDataStart, 0x20)))) // nonceTrack
            mstore(add(ptr, 28), calldataload(add(happyTxDataStart, 0x40))) // gasLimit

            // Pack second word: dest (20) + nonce (8) + padding
            mstore(add(ptr, 32), shl(96, calldataload(add(happyTxDataStart, 0x60)))) // dest
            mstore(add(ptr, 52), calldataload(add(happyTxDataStart, 0x80))) // nonce

            // Store validator (20)
            mstore(add(ptr, 64), shl(96, calldataload(add(happyTxDataStart, 0xa0)))) // validator

            // Store paymaster (20)
            mstore(add(ptr, 84), shl(96, calldataload(add(happyTxDataStart, 0xc0)))) // paymaster

            // Store value (32)
            mstore(add(ptr, 104), calldataload(add(happyTxDataStart, 0xe0))) // value

            // Store maxFeePerGas (32)
            mstore(add(ptr, 136), calldataload(add(happyTxDataStart, 0x100))) // maxFeePerGas

            // Get dynamic array offsets from calldata
            let callDataOffset := add(happyTxDataStart, calldataload(add(happyTxDataStart, 0x120)))
            let validationDataOffset := add(happyTxDataStart, calldataload(add(happyTxDataStart, 0x140)))
            let paymasterDataOffset := add(happyTxDataStart, calldataload(add(happyTxDataStart, 0x160)))
            let extraDataOffset := add(happyTxDataStart, calldataload(add(happyTxDataStart, 0x180)))

            // Get lengths of dynamic arrays
            let callDataLength := calldataload(callDataOffset)
            let validationDataLength := calldataload(validationDataOffset)
            let paymasterDataLength := calldataload(paymasterDataOffset)
            let extraDataLength := calldataload(extraDataOffset)

            // Store dynamic field lengths in a single word
            let dynamicLengths := 0
            dynamicLengths := or(dynamicLengths, callDataLength)
            dynamicLengths := or(dynamicLengths, shl(DYNAMIC_FIELD_LENGTH_BITS, validationDataLength))
            dynamicLengths := or(dynamicLengths, shl(mul(DYNAMIC_FIELD_LENGTH_BITS, 2), paymasterDataLength)) //solhint-disable-line max-line-length
            dynamicLengths := or(dynamicLengths, shl(mul(DYNAMIC_FIELD_LENGTH_BITS, 3), extraDataLength)) //solhint-disable-line max-line-length

            mstore(add(ptr, 168), dynamicLengths)

            // Copy dynamic data
            let dynamicPtr := add(ptr, 200)

            // Copy callData
            calldatacopy(dynamicPtr, add(callDataOffset, 0x20), callDataLength)
            dynamicPtr := add(dynamicPtr, callDataLength)

            // Copy validationData
            calldatacopy(dynamicPtr, add(validationDataOffset, 0x20), validationDataLength)
            dynamicPtr := add(dynamicPtr, validationDataLength)

            // Copy paymasterData
            calldatacopy(dynamicPtr, add(paymasterDataOffset, 0x20), paymasterDataLength)
            dynamicPtr := add(dynamicPtr, paymasterDataLength)

            // Copy extraData
            calldatacopy(dynamicPtr, add(extraDataOffset, 0x20), extraDataLength)
        }

        return result;
    }

    /**
     * @dev Decodes bytes in memory into a HappyTx struct
     * @param encoded The encoded bytes in memory
     * @return happyTx The decoded HappyTx struct
     */
    function decodeFromMemory(bytes memory encoded) internal view returns (HappyTx memory happyTx) {
        if (encoded.length < 196) revert InvalidEncodedLength();

        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Allocate memory for HappyTx struct
            happyTx := mload(0x40)
            mstore(0x40, add(happyTx, 0x280)) // 640 bytes for the struct (13 fields * 32 bytes + padding)

            let ptr := add(encoded, 32) // Skip length prefix

            // Decode static fields
            mstore(add(happyTx, 32), shr(96, mload(ptr))) // account
            mstore(add(happyTx, 64), shr(32, mload(add(ptr, 20)))) // nonceTrack
            mstore(add(happyTx, 96), mload(add(ptr, 28))) // gasLimit

            mstore(add(happyTx, 128), shr(96, mload(add(ptr, 32)))) // dest
            mstore(add(happyTx, 160), mload(add(ptr, 52))) // nonce

            mstore(add(happyTx, 192), shr(96, mload(add(ptr, 64)))) // validator
            mstore(add(happyTx, 224), shr(96, mload(add(ptr, 84)))) // paymaster

            mstore(add(happyTx, 256), mload(add(ptr, 104))) // value
            mstore(add(happyTx, 288), mload(add(ptr, 136))) // maxFeePerGas

            // Decode dynamic field lengths
            let dynamicLengths := mload(add(ptr, 168))
            let callDataLength := and(dynamicLengths, MASK_DYNAMIC_FIELD_LENGTH)
            let validationDataLength := and(shr(DYNAMIC_FIELD_LENGTH_BITS, dynamicLengths), MASK_DYNAMIC_FIELD_LENGTH)
            let paymasterDataLength :=
                and(shr(mul(DYNAMIC_FIELD_LENGTH_BITS, 2), dynamicLengths), MASK_DYNAMIC_FIELD_LENGTH) //solhint-disable-line max-line-length
            let extraDataLength :=
                and(shr(mul(DYNAMIC_FIELD_LENGTH_BITS, 3), dynamicLengths), MASK_DYNAMIC_FIELD_LENGTH) //solhint-disable-line max-line-length

            // Allocate and copy dynamic fields
            let dynamicPtr := add(ptr, 200)

            // Copy callData
            let dataPtr := mload(0x40)
            mstore(0x40, add(dataPtr, add(64, callDataLength)))
            mstore(add(happyTx, 320), dataPtr)
            mstore(dataPtr, callDataLength)
            dataPtr := add(dataPtr, 32)
            pop(staticcall(gas(), 4, dynamicPtr, callDataLength, dataPtr, callDataLength))
            dynamicPtr := add(dynamicPtr, callDataLength)

            // Copy validationData
            dataPtr := mload(0x40)
            mstore(0x40, add(dataPtr, add(64, validationDataLength)))
            mstore(add(happyTx, 352), dataPtr)
            mstore(dataPtr, validationDataLength)
            dataPtr := add(dataPtr, 32)
            pop(staticcall(gas(), 4, dynamicPtr, validationDataLength, dataPtr, validationDataLength))
            dynamicPtr := add(dynamicPtr, validationDataLength)

            // Copy paymasterData
            dataPtr := mload(0x40)
            mstore(0x40, add(dataPtr, add(64, paymasterDataLength)))
            mstore(add(happyTx, 384), dataPtr)
            mstore(dataPtr, paymasterDataLength)
            dataPtr := add(dataPtr, 32)
            pop(staticcall(gas(), 4, dynamicPtr, paymasterDataLength, dataPtr, paymasterDataLength))
            dynamicPtr := add(dynamicPtr, paymasterDataLength)

            // Copy extraData
            dataPtr := mload(0x40)
            mstore(0x40, add(dataPtr, add(64, extraDataLength)))
            mstore(add(happyTx, 416), dataPtr)
            mstore(dataPtr, extraDataLength)
            dataPtr := add(dataPtr, 32)
            pop(staticcall(gas(), 4, dynamicPtr, extraDataLength, dataPtr, extraDataLength))
        }
    }

    /**
     * @dev Estimates the gas needed for a transaction
     * @param happyTx The transaction to estimate
     * @return The estimated gas required to execute the HappyTx
     */
    function estimateGas(HappyTx memory happyTx) internal pure returns (uint256) {
        // Base cost
        uint256 gas = 21000;

        // Add cost for calldata
        for (uint256 i = 0; i < happyTx.callData.length; i++) {
            gas += happyTx.callData[i] == 0 ? 4 : 16;
        }

        // Add validation cost if validator present
        if (happyTx.validator != address(0)) {
            gas += 40000; // Approximate validation cost
        }

        // Add paymaster cost if present
        if (happyTx.paymaster != address(0)) {
            gas += 40000; // Approximate paymaster cost
        }

        return gas;
    }
}
