// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Boop} from "boop/interfaces/Types.sol";

library Encoding {
    /// Selector returned by {decode} when unable to properly decode a boop.
    error MalformedBoop();

    /// @dev Size of the static fields in the encoded Boop.
    /// (20 + 20 + 20 + 32 + 32 + 32 + 24 + 8 + 4 + 4 + 4 = 204)
    uint256 private constant DYNAMIC_FIELDS_OFFSET = 204;

    /**
     * Encodes a Boop struct into a compact bytes array, for minimal memory usage.
     * The encoding is done by packing fields end-to-end without 32-byte word alignment, making it
     * more gas efficient than standard ABI encoding. Dynamic fields are prefixed with their lengths
     * as uint32.
     *
     * Encoding Format:
     * - fixed size fields:
     *      - account (20b)
     *      - dest (20b)
     *      - payer (20b)
     *
     *      - value (32b)
     *      - nonceTrack (24b)
     *      - nonceValue (8b)
     *
     *      - maxFeePerGas (32b)
     *      - submitterFee (32b)
     *
     *      - gasLimit (4b)
     *      - validateGasLimit (4b)
     *      - executeGasLimit (4b)
     *      - validatePaymentGasLimit (4b)
     *
     * - dynamic fields:
     *      - callData (length: 4b = N, data: Nb)
     *      - validatorData (length: 4b = N, data: Nb)
     *      - extraData (length: 4b = N, data: Nb)
     */
    function encode(Boop memory boop) internal pure returns (bytes memory result) {
        // Dynamic fields: 4 bytes length + actual length for each dynamic field
        // Calculate total size needed for the encoded bytes
        // forgefmt: disable-next-item
        uint256 totalSize = DYNAMIC_FIELDS_OFFSET
            + (4 + boop.callData.length)
            + (4 + boop.validatorData.length)
            + (4 + boop.extraData.length);

        assembly {
            // Encoded tx will live at next free memory address.
            result := mload(0x40)
            // Update free memory pointer to point past decoded bytes (+32 bytes is for length).
            mstore(0x40, add(result, add(totalSize, 32)))
            // Store length of the encoded tx.
            mstore(result, totalSize)

            // Start writing to `result` after the length prefix slot
            let inPtr := boop
            let outPtr := add(result, 32)

            // Copy account (20 bytes)
            mcopy(outPtr, add(inPtr, 12), 20)
            outPtr := add(outPtr, 20)
            inPtr := add(inPtr, 32)

            // Copy dest (20 bytes)
            mcopy(outPtr, add(inPtr, 12), 20)
            outPtr := add(outPtr, 20)
            inPtr := add(inPtr, 32)

            // Copy payer (20 bytes)
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

            // Copy gasLimit (4 bytes)
            mcopy(outPtr, add(inPtr, 28), 4)
            outPtr := add(outPtr, 4)
            inPtr := add(inPtr, 32)

            // Copy validateGasLimit (4 bytes)
            mcopy(outPtr, add(inPtr, 28), 4)
            outPtr := add(outPtr, 4)
            inPtr := add(inPtr, 32)

            // Copy validatePaymentGasLimit (4 bytes)
            mcopy(outPtr, add(inPtr, 28), 4)
            outPtr := add(outPtr, 4)
            inPtr := add(inPtr, 32)

            // Copy executeGasLimit (4 bytes)
            mcopy(outPtr, add(inPtr, 28), 4)
            outPtr := add(outPtr, 4)
            inPtr := add(inPtr, 32)

            // Handle dynamic fields
            let callDataOffset := mload(inPtr)
            let validatorDataOffset := mload(add(inPtr, 32))
            let extraDataOffset := mload(add(inPtr, 64))

            let len

            // callData
            len := mload(callDataOffset)
            mcopy(outPtr, add(callDataOffset, 28), 4)
            outPtr := add(outPtr, 4)
            mcopy(outPtr, add(callDataOffset, 32), len)
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

    /// Decodes an encodedBoop that was encoded using {encode}.
    function decode(bytes calldata encodedBoop) internal pure returns (Boop memory result) {
        // First validate minimum length (196 bytes for the static fields)
        if (encodedBoop.length < DYNAMIC_FIELDS_OFFSET) revert MalformedBoop();

        uint32 len;
        uint256 offset;

        assembly ("memory-safe") {
            // Get pointer to the calldata bytes
            let cdPtr := encodedBoop.offset
            let memPtr := result

            // Copy account (20 bytes) + zero pad to 32 bytes
            calldatacopy(add(memPtr, 12), cdPtr, 20)
            cdPtr := add(cdPtr, 20)
            memPtr := add(memPtr, 32)

            // Copy dest (20 bytes) + zero pad to 32 bytes
            calldatacopy(add(memPtr, 12), cdPtr, 20)
            cdPtr := add(cdPtr, 20)
            memPtr := add(memPtr, 32)

            // Copy payer (20 bytes) + zero pad to 32 bytes
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
            memPtr := add(memPtr, 32)

            // Copy gasLimit (4 bytes) + zero pad to 32 bytes
            calldatacopy(add(memPtr, 28), cdPtr, 4)
            cdPtr := add(cdPtr, 4)
            memPtr := add(memPtr, 32)

            // Copy validateGasLimit (4 bytes) + zero pad to 32 bytes
            calldatacopy(add(memPtr, 28), cdPtr, 4)
            cdPtr := add(cdPtr, 4)
            memPtr := add(memPtr, 32)

            // Copy validatePaymentGasLimit (4 bytes) + zero pad to 32 bytes
            calldatacopy(add(memPtr, 28), cdPtr, 4)
            cdPtr := add(cdPtr, 4)
            memPtr := add(memPtr, 32)

            // Copy executeGaslimit (4 bytes) + zero pad to 32 bytes
            calldatacopy(add(memPtr, 28), cdPtr, 4)
            cdPtr := add(cdPtr, 4)
            memPtr := add(memPtr, 32)

            // Dynamic fields offset is the difference between current and start position
            offset := sub(cdPtr, encodedBoop.offset)
        }

        // Read callData length (4 bytes) and data
        len = uint32(bytes4(encodedBoop[offset:offset + 4]));
        offset += 4;
        result.callData = encodedBoop[offset:offset + len];
        offset += len;

        // Read validatorData length (4 bytes) and data
        len = uint32(bytes4(encodedBoop[offset:offset + 4]));
        offset += 4;
        result.validatorData = encodedBoop[offset:offset + len];
        offset += len;

        // Read extraData length (4 bytes) and data
        uint32 extraDataLen = uint32(bytes4(encodedBoop[offset:offset + 4]));
        offset += 4;
        result.extraData = encodedBoop[offset:offset + extraDataLen];
    }
}
