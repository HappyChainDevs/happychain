// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Encoding} from "boop/core/Encoding.sol";
import {Boop} from "boop/interfaces/Types.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";

library Utils {
    using ECDSA for bytes32;
    using Encoding for Boop;
    /**
     * Returns an overestimate of the size of a submitter transaction sending this boop directly
     * to {EntryPoint.submit}, without an access list.
     */

    function estimateSubmitterTxSize(Boop memory boop) internal pure returns (uint256) {
        // forgefmt: disable-next-item
        return 280 // maximum size of tx with an empty access list, exclusive boop encoding
            + 220 // encoding fixed part: 204 for static fields + 16 bytes for length of dynamic fields
            + boop.callData.length
            + boop.validatorData.length
            + boop.extraData.length;
    }

    /**
     * Returns an overestimation of the gas consumed by a submitter transaction sending this boop
     * directly to {EntryPoint.submit}, without an access list.
     *
     * @param submitGas Estimation of the gas consumed by the execution of {EntryPoint.submit}
     * @param encodedBoopLength Length of the encoded boop
     */
    function estimateSubmitterTxGas(uint256 submitGas, uint256 encodedBoopLength) internal pure returns (uint32) {
        uint32 regularGas = uint32(encodedBoopLength + 280 * 16 + submitGas + 21_000 + 3000);
        uint32 eip7623Gas = uint32(encodedBoopLength + 280 * 40);
        return regularGas > eip7623Gas ? regularGas : eip7623Gas;
        // 280 = maximum size of tx with an empty access list, including allowance for 4 bytes selector
        // 16 = calldata cost for non-zero byte
        // 40 = calldata cost for non-zero byte if the EIP-7623 regime kicks in
        // 21_000 = fixed intrinsic gas
        // 3000 = overestimation of {EntryPoint.submit} dispatch overhead
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

    /**
     * Computes the EIP-191 signed message hash for a boop.
     *
     * @dev This ignores the `validatorField` for the boop, as well as the gas limits and fee values if the boop
     * is sponsored by a paymaster or by the submitter.
     *
     * @param boop The boop to compute the hash for.
     * @param restore Whether to restore the original validatorData/gas limits/fee values after computing the hash.
     * @return The EIP-191 signed message hash for the boop.
     */
    function computeBoopHash(Boop memory boop, bool restore) internal view returns (bytes32) {
        // Set validatorData to empty for hashing
        bytes memory originalValidatorData = boop.validatorData;
        boop.validatorData = "";

        uint32 originalGasLimit = 0;
        uint32 originalValidateGasLimit = 0;
        uint32 originalValidatePaymentGasLimit = 0;
        uint32 originalExecuteGasLimit = 0;
        uint256 originalMaxFeePerGas = 0;
        int256 originalSubmitterFee = 0;

        bool isSelfPaying = boop.payer == boop.account;
        if (!isSelfPaying) {
            // Only store the original gas values if we're restoring
            if (restore) {
                originalGasLimit = boop.gasLimit;
                originalValidateGasLimit = boop.validateGasLimit;
                originalValidatePaymentGasLimit = boop.validatePaymentGasLimit;
                originalExecuteGasLimit = boop.executeGasLimit;
                originalMaxFeePerGas = boop.maxFeePerGas;
                originalSubmitterFee = boop.submitterFee;
            }

            boop.gasLimit = 0;
            boop.validateGasLimit = 0;
            boop.validatePaymentGasLimit = 0;
            boop.executeGasLimit = 0;
            boop.maxFeePerGas = 0;
            boop.submitterFee = 0;
        }

        bytes32 hash = keccak256(abi.encodePacked(boop.encode(), block.chainid)).toEthSignedMessageHash();

        if (restore) {
            boop.validatorData = originalValidatorData;

            if (!isSelfPaying) {
                boop.gasLimit = originalGasLimit;
                boop.validateGasLimit = originalValidateGasLimit;
                boop.validatePaymentGasLimit = originalValidatePaymentGasLimit;
                boop.executeGasLimit = originalExecuteGasLimit;
                boop.maxFeePerGas = originalMaxFeePerGas;
                boop.submitterFee = originalSubmitterFee;
            }
        }

        return hash;
    }
}
