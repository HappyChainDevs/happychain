// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Boop} from "boop/core/Boop.sol";

library Utils {
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
     * @dev Returns an overestimation of the gas consumed by a transaction
     * @param callGas The gas consumed by the function call
     * @param calldataLength The length of the calldata
     * @return The estimated total gas consumption including:
     *         - 21000 fixed intrinsic gas
     *         - Calldata gas cost assuming all non-zero bytes (overestimation)
     *         - callGas
     *         - Function dispatch overhead
     */
    function txGasFromCallGas(uint256 callGas, uint256 calldataLength) internal pure returns (uint32) {
        // forgefmt: disable-next-item
        return uint32((RLP_ENCODED_TX_LENGTH + calldataLength) * CALLDATA_GAS_PER_BYTE
            + callGas
            + INTRINSIC_TX_GAS
            + FUNCTION_DISPATCH_OVERHEAD);
    }

    /**
     * @dev Returns the maximum fee per byte for a Boop's calldata
     * @return The maximum fee per byte, calculated by overestimating all calldata bytes
     *         as non-zero (16 gas per byte).
     */
    function maxCalldataFeePerByte(Boop memory boop) internal pure returns (uint256) {
        return (boop.maxFeePerGas) * CALLDATA_GAS_PER_BYTE;
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
        bytes3 currentKey;
        uint24 currentLen;
        bytes32 offset;
        assembly ("memory-safe") {
            offset := add(extraData, 0x20) // skip length
        }

        uint256 end = uint256(offset) + extraData.length;

        while (uint256(offset) + 6 <= end) {
            assembly ("memory-safe") {
                currentKey := mload(offset)
                offset := add(offset, 3)
                currentLen := shr(232, mload(offset))
                offset := add(offset, 3)
            }

            if (uint256(offset) + currentLen > end) {
                break; // not enough bytes left for the value
            }

            if (currentKey == key) {
                value = new bytes(currentLen);
                assembly ("memory-safe") {
                    mcopy(add(value, 0x20), offset, currentLen)
                }
                return (true, value);
            }

            assembly ("memory-safe") {
                offset := add(offset, currentLen)
            }
        }

        return (false, new bytes(0));
    }
}
