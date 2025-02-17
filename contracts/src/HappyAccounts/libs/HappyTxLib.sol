// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../core/HappyTx.sol";

/// @notice Utility library for encoding and decoding HappyTx structs with efficient gas usage and minimal overhead.
library HappyTxLib {
    /// @notice Selector returned by {decode} when unable to properly decode a happyTx.
    error MalformedHappyTx();

    /// @dev Encoded HappyTx takes up 196 bytes for the static fields.
    uint256 private constant DYNAMIC_FIELDS_OFFSET = 196;

    /// @dev Assuming all calldata bytes are non-zero (16 gas per byte).
    uint256 private constant CALLDATA_GAS_PER_BYTE = 16;

    /**
     * @notice Encodes a HappyTx struct into a compact bytes array, for minimal memory usage.
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
     *
     * @param happyTx The transaction to encode
     * @return result The encoded transaction bytes
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
            // The dynamic field slots store the offsets from the start of the HappyTx memory slot
            // Correct required for each field, by moving back 4 slots from the offset
            let callDataOffset := sub(mload(inPtr), 128)
            let pmDataOffset := sub(mload(add(inPtr, 32)), 128)
            let validatorDataOffset := sub(mload(add(inPtr, 64)), 128)
            let extraDataOffset := sub(mload(add(inPtr, 96)), 128)

            let len
            let offset

            // callData
            offset := add(happyTx, callDataOffset)
            len := mload(offset)

            mcopy(outPtr, add(offset, 28), 4)
            outPtr := add(outPtr, 4)
            offset := add(offset, 32)

            mcopy(outPtr, offset, len)
            outPtr := add(outPtr, len)

            // paymasterData
            offset := add(happyTx, pmDataOffset)
            len := mload(offset)

            mcopy(outPtr, add(offset, 28), 4)
            outPtr := add(outPtr, 4)
            offset := add(offset, 32)

            mcopy(outPtr, offset, len)
            outPtr := add(outPtr, len)

            // validatorData
            offset := add(happyTx, validatorDataOffset)
            len := mload(offset)

            mcopy(outPtr, add(offset, 28), 4)
            outPtr := add(outPtr, 4)
            offset := add(offset, 32)

            mcopy(outPtr, offset, len)
            outPtr := add(outPtr, len)

            // extraData
            offset := add(happyTx, extraDataOffset)
            len := mload(offset)

            mcopy(outPtr, add(offset, 28), 4)
            outPtr := add(outPtr, 4)
            offset := add(offset, 32)

            mcopy(outPtr, offset, len)
            outPtr := add(outPtr, len)
        }
    }

    /**
     * @dev Decodes an encodedHappyTx that was encoded using {HappyTxLib.encode}.
     * @param encodedHappyTx The encoded happyTx bytes
     * @return result The decoded HappyTx struct
     */
    function decode(bytes calldata encodedHappyTx) public pure returns (HappyTx memory result) {
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
     *         - Calldata gas cost assuming all non-zero bytes
     *         - callGas
     *         - Function dispatch overhead (TODO)
     */
    function txGasFromCallGas(uint256 callGas, uint256 calldataLength) internal pure returns (uint256) {
        return 21000 + (200 + calldataLength) * CALLDATA_GAS_PER_BYTE + callGas; // + TODO;

        // - `(200 + calldataLength) * 16` is an overestimate of the calldata part of the
        //    intrinsic gas obtained by assuming every byte is non-zero in the tx data.
        //     - A transaction without calldata and access list is at most ~280 bytes
        //       but due to RLP encoding this should be lower. 200 is a good compromise,
        //       essentially since we already overcharge for the bytes whose value is 0.
    }

    /**
     * @dev Returns the maximum fee per byte for a HappyTx's calldata
     * @return The maximum fee per byte, calculated by overestimating all calldata bytes
     *         as non-zero (16 gas per byte).
     */
    function maxCalldataFeePerByte(HappyTx memory happyTx) internal pure returns (uint256) {
        return (happyTx.maxFeePerGas) * CALLDATA_GAS_PER_BYTE;
    }
}
