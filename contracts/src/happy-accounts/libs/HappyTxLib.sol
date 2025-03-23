// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../core/HappyTx.sol";

library HappyTxLib {
    /// Selector returned by {decode} when unable to properly decode a happyTx.
    error MalformedHappyTx();

    /// @dev Encoded HappyTx takes up 196 bytes for the static fields.
    uint256 private constant DYNAMIC_FIELDS_OFFSET = 196;

    /// @dev Assuming all calldata bytes are non-zero (16 gas per byte).
    uint256 private constant CALLDATA_GAS_PER_BYTE = 16;

    /// @dev Gas overhead for calling the txGasFromCallGas function
    uint256 private constant FUNCTION_DISPATCH_OVERHEAD = 380;

    /// @dev Standard Ethereum transaction base cost (21_000)
    uint256 private constant INTRINSIC_TX_GAS = 21_000;

    /// @dev Estimated length in bytes of a transaction after RLP encoding without calldata/access list.
    ///      A transaction without calldata and an empty access list is at most ~220 bytes after RLP encoding.
    ///      We use 200 as a good compromise since we already overcharge for zero-value bytes in the calldata.
    uint256 private constant RLP_ENCODED_TX_LENGTH = 200;

    /**
     * Encodes a HappyTx struct into a compact bytes array, for minimal memory usage.
     * The encoding is done by packing fields end-to-end without 32-byte word alignment, making it
     * more gas efficient than standard ABI encoding. Dynamic fields are prefixed with their lengths
     * as uint32.
     *
     * Encoding Format:
     * ┌─────────────────────────────────────────────────────────────┐
     * │                       Fixed Size Fields                     │
     * ├──────────┬──────┬──────┬──────────┬──────────┬──────────────┤
     * │ account  │ gas  │ exec │  dest    │paymaster │    value     │
     * │ (20b)    │ (4b) │ (4b) │  (20b)   │  (20b)   │    (32b)     │
     * ├──────────┴──────┴──────┴──────────┴──────────┴──────────────┤
     * │                  More Fixed Size Fields                     │
     * ├──────────┬──────┬───────────────┬───────────────┐           │
     * │nonceTrack│nonce │  maxFeePerGas │ submitterFee  │           │
     * │  (24b)   │ (8b) │     (32b)     │    (32b)      │           │
     * ├──────────┴──────┴───────────────┴───────────────┘           │
     * │                     Dynamic Fields                          │
     * ├─────┬─────────┬─────┬────────────┬─────┬──────────┬─────┬───┤
     * │len  │callData │len  │paymaster   │len  │validator │len  │ext│
     * │(4b) │  (Nb)   │(4b) │Data (Nb)   │(4b) │Data (Nb) │(4b) │(N)│
     * └─────┴─────────┴─────┴────────────┴─────┴──────────┴─────┴───┘
     */
    function encode(HappyTx memory happyTx) internal pure returns (bytes memory result) {
        // Fixed size fields: 20 + 4 + 4 + 20 + 20 + 32 + 24 + 8 + 32 + 32 = 196 bytes
        // Dynamic fields: 4 bytes length + actual length for each dynamic field
        // Calculate total size needed for the encoded bytes
        uint256 totalSize = 196 + (4 + happyTx.callData.length) + (4 + happyTx.paymasterData.length)
            + (4 + happyTx.validatorData.length) + (4 + happyTx.extraData.length);
        assembly {
            // Encoded tx will live at next free memory address.
            result := mload(0x40)
            // Update free memory pointer to point past decoded bytes (+32 bytes is for length).
            mstore(0x40, add(result, add(totalSize, 32)))
            // Store length of the encoded tx.
            mstore(result, totalSize)

            // Start writing to `result` after the length prefix slot
            let inPtr := happyTx
            let outPtr := add(result, 32)

            // Copy account (20 bytes)
            mcopy(outPtr, add(inPtr, 12), 20)
            outPtr := add(outPtr, 20)
            inPtr := add(inPtr, 32)

            // Copy gasLimit (4 bytes)
            mcopy(outPtr, add(inPtr, 28), 4)
            outPtr := add(outPtr, 4)
            inPtr := add(inPtr, 32)

            // Copy executeGasLimit (4 bytes)
            mcopy(outPtr, add(inPtr, 28), 4)
            outPtr := add(outPtr, 4)
            inPtr := add(inPtr, 32)

            // Copy dest (20 bytes)
            mcopy(outPtr, add(inPtr, 12), 20)
            outPtr := add(outPtr, 20)
            inPtr := add(inPtr, 32)

            // Copy paymaster (20 bytes)
            mcopy(outPtr, add(inPtr, 12), 20)
            outPtr := add(outPtr, 20)
            inPtr := add(inPtr, 32)

            // Copy value (32 bytes)
            mcopy(outPtr, inPtr, 32)
            outPtr := add(outPtr, 32)
            inPtr := add(inPtr, 32)

            // Copy nonceTrack (24 bytes)
            mcopy(outPtr, add(inPtr, 8), 24)
            outPtr := add(outPtr, 24)
            inPtr := add(inPtr, 32)

            // Copy nonceValue (8 bytes)
            mcopy(outPtr, add(inPtr, 24), 8)
            outPtr := add(outPtr, 8)
            inPtr := add(inPtr, 32)

            // Copy maxFeePerGas (32 bytes)
            mcopy(outPtr, inPtr, 32)
            outPtr := add(outPtr, 32)
            inPtr := add(inPtr, 32)

            // Copy submitterFee (32 bytes)
            mcopy(outPtr, inPtr, 32)
            outPtr := add(outPtr, 32)
            inPtr := add(inPtr, 32)

            // Handle dynamic fields
            let callDataOffset := mload(inPtr)
            let pmDataOffset := mload(add(inPtr, 32))
            let validatorDataOffset := mload(add(inPtr, 64))
            let extraDataOffset := mload(add(inPtr, 96))

            let len

            // callData
            len := mload(callDataOffset)
            mcopy(outPtr, add(callDataOffset, 28), 4)
            outPtr := add(outPtr, 4)
            mcopy(outPtr, add(callDataOffset, 32), len)
            outPtr := add(outPtr, len)

            // paymasterData
            len := mload(pmDataOffset)
            mcopy(outPtr, add(pmDataOffset, 28), 4)
            outPtr := add(outPtr, 4)
            mcopy(outPtr, add(pmDataOffset, 32), len)
            outPtr := add(outPtr, len)

            // validatorData
            len := mload(validatorDataOffset)
            mcopy(outPtr, add(validatorDataOffset, 28), 4)
            outPtr := add(outPtr, 4)
            mcopy(outPtr, add(validatorDataOffset, 32), len)
            outPtr := add(outPtr, len)

            // extraData
            len := mload(extraDataOffset)
            mcopy(outPtr, add(extraDataOffset, 28), 4)
            outPtr := add(outPtr, 4)
            mcopy(outPtr, add(extraDataOffset, 32), len)
            outPtr := add(outPtr, len)
        }
    }

    /// Decodes an encodedHappyTx that was encoded using {HappyTxLib.encode}.
    function decode(bytes calldata encodedHappyTx) internal pure returns (HappyTx memory result) {
        // First validate minimum length (196 bytes for the static fields)
        if (encodedHappyTx.length < DYNAMIC_FIELDS_OFFSET) revert MalformedHappyTx();

        uint32 len;
        uint256 offset;

        assembly {
            // Get pointer to the calldata bytes
            let cdPtr := encodedHappyTx.offset
            let memPtr := result

            // Copy account (20 bytes) + zero pad to 32 bytes
            calldatacopy(add(memPtr, 12), cdPtr, 20)
            cdPtr := add(cdPtr, 20)
            memPtr := add(memPtr, 32)

            // Copy gasLimit (4 bytes) + zero pad to 32 bytes
            calldatacopy(add(memPtr, 28), cdPtr, 4)
            cdPtr := add(cdPtr, 4)
            memPtr := add(memPtr, 32)

            // Copy executeGasLimit (4 bytes) + zero pad to 32 bytes
            calldatacopy(add(memPtr, 28), cdPtr, 4)
            cdPtr := add(cdPtr, 4)
            memPtr := add(memPtr, 32)

            // Copy dest (20 bytes) + zero pad to 32 bytes
            calldatacopy(add(memPtr, 12), cdPtr, 20)
            cdPtr := add(cdPtr, 20)
            memPtr := add(memPtr, 32)

            // Copy paymaster (20 bytes) + zero pad to 32 bytes
            calldatacopy(add(memPtr, 12), cdPtr, 20)
            cdPtr := add(cdPtr, 20)
            memPtr := add(memPtr, 32)

            // Copy value (32 bytes)
            calldatacopy(memPtr, cdPtr, 32)
            cdPtr := add(cdPtr, 32)
            memPtr := add(memPtr, 32)

            // Copy NonceTrack (24 bytes) + zero pad to 32 bytes
            calldatacopy(add(memPtr, 8), cdPtr, 24)
            cdPtr := add(cdPtr, 24)
            memPtr := add(memPtr, 32)

            // Copy NonceValue (8 bytes) + zero pad to 32 bytes
            calldatacopy(add(memPtr, 24), cdPtr, 8)
            cdPtr := add(cdPtr, 8)
            memPtr := add(memPtr, 32)

            // Copy maxFeePerGas (32 bytes)
            calldatacopy(memPtr, cdPtr, 32)
            cdPtr := add(cdPtr, 32)
            memPtr := add(memPtr, 32)

            // Copy submitterFee (32 bytes)
            calldatacopy(memPtr, cdPtr, 32)
            cdPtr := add(cdPtr, 32)

            // Dynamic fields offset is the difference between current and start position
            offset := sub(cdPtr, encodedHappyTx.offset)
        }

        // Read callData length (4 bytes) and data
        len = uint32(bytes4(encodedHappyTx[offset:offset + 4]));
        offset += 4;
        result.callData = encodedHappyTx[offset:offset + len];
        offset += len;

        // Read paymasterData length (4 bytes) and data
        len = uint32(bytes4(encodedHappyTx[offset:offset + 4]));
        offset += 4;
        result.paymasterData = encodedHappyTx[offset:offset + len];
        offset += len;

        // Read validatorData length (4 bytes) and data
        len = uint32(bytes4(encodedHappyTx[offset:offset + 4]));
        offset += 4;
        result.validatorData = encodedHappyTx[offset:offset + len];
        offset += len;

        // Read extraData length (4 bytes) and data
        uint32 extraDataLen = uint32(bytes4(encodedHappyTx[offset:offset + 4]));
        offset += 4;
        result.extraData = encodedHappyTx[offset:offset + extraDataLen];
    }

    /**
     * @dev Returns an overestimation of the gas consumed by a transaction
     * @param callGas The gas consumed by the function call
     * @param calldataLength The length of the calldata
     * @return The estimated total gas consumption including:
     *         - 21000 fixed intrinsic gas
     *         - Calldata gas cost assuming all non-zero bytes (overestimation)
     *         - callGas
     *         - Function dispatch overhead
     */
    function txGasFromCallGas(uint256 callGas, uint256 calldataLength) internal pure returns (uint256) {
        // forgefmt: disable-next-item
        return (RLP_ENCODED_TX_LENGTH + calldataLength) * CALLDATA_GAS_PER_BYTE
            + callGas
            + INTRINSIC_TX_GAS
            + FUNCTION_DISPATCH_OVERHEAD;
    }

    /**
     * @dev Returns the maximum fee per byte for a HappyTx's calldata
     * @return The maximum fee per byte, calculated by overestimating all calldata bytes
     *         as non-zero (16 gas per byte).
     */
    function maxCalldataFeePerByte(HappyTx memory happyTx) internal pure returns (uint256) {
        return (happyTx.maxFeePerGas) * CALLDATA_GAS_PER_BYTE;
    }

    /**
     * @dev Retrieves a value from the extraData field by looking up a specific key
     * @param extraData The encoded extra data byte array to search in
     * @param key The 3-byte key to lookup in the extraData
     * @return found Boolean indicating whether the key was found
     * @return value The value associated with the key, or empty bytes if not found
     */
    function getExtraDataValue(bytes memory extraData, bytes3 key)
        internal
        pure
        returns (bool found, bytes memory value)
    {
        uint256 i = 0;
        bytes32 offset;
        bytes3 currentKey;
        uint24 currentLen;

        while (i + 6 <= extraData.length) {
            assembly {
                offset := add(add(extraData, 0x20), i)
                currentKey := mload(offset)
                currentLen := shr(232, mload(add(offset, 3)))
            }

            // Check if we have enough bytes left for the value
            if (i + 6 + currentLen > extraData.length) {
                break;
            }

            // If key matches, extract and return the value
            if (currentKey == key) {
                value = new bytes(currentLen);
                assembly {
                    mcopy(add(value, 0x20), add(offset, 6), currentLen)
                }
                return (true, value);
            }

            // Skip to next entry
            i += 6 + currentLen;
        }

        return (false, new bytes(0));
    }
}
