// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../HappyTx.sol";

/**
 * @title  HappyTxLib
 * @dev    Library for encoding and decoding HappyTx structs.
 *         This is a placeholder implementation that will be replaced with
 *         proper MUD-style encoding for efficiency.
 */
library HappyTxLib {
    /**
     * @dev Computes the hash of a HappyTx for signing
     * @param happyTx The transaction to hash
     * @return The hash to sign
     */
    function getHappyTxHash(HappyTx memory happyTx) internal view returns (bytes32) {
        return keccak256(
            abi.encodePacked( // TODO: Update to use MUD encoding, then hash with keccak
                happyTx.account,
                happyTx.dest,
                happyTx.value,
                keccak256(happyTx.callData),
                happyTx.nonceTrack,
                happyTx.nonce,
                happyTx.maxFeePerGas,
                happyTx.gasLimit,
                block.chainid
            )
        );
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

    /**
     * @dev Encodes a HappyTx struct into bytes
     * @param happyTx The HappyTx struct to encode
     * @return The encoded bytes
     * @notice TODO: Implement efficient encoding
     */
    function encode(HappyTx memory happyTx) internal pure returns (bytes memory) {
        // Placeholder: Simple abi.encode for now
        return abi.encode(
            happyTx.account,
            happyTx.dest,
            happyTx.value,
            happyTx.callData,
            happyTx.nonceTrack,
            happyTx.nonce,
            happyTx.maxFeePerGas,
            happyTx.gasLimit,
            happyTx.validator,
            happyTx.validationData,
            happyTx.paymaster,
            happyTx.paymasterData,
            happyTx.extraData
        );
    }

    /**
     * @dev Decodes bytes into a HappyTx struct
     * @param encoded The bytes to decode
     * @return The decoded HappyTx struct
     * @notice TODO: Implement efficient decoding
     */
    function decode(bytes calldata encoded) internal pure returns (HappyTx memory) {
        // Placeholder: Simple abi.decode for now
        (
            address account,
            address dest,
            uint256 value,
            bytes memory callData,
            uint64 nonceTrack,
            uint64 nonce,
            uint256 maxFeePerGas,
            uint32 gasLimit,
            address validator,
            bytes memory validationData,
            address paymaster,
            bytes memory paymasterData,
            bytes memory extraData
        ) = abi.decode(
            encoded,
            (address, address, uint256, bytes, uint64, uint64, uint256, uint32, address, bytes, address, bytes, bytes)
        );

        return HappyTx({
            account: account,
            dest: dest,
            value: value,
            callData: callData,
            nonceTrack: nonceTrack,
            nonce: nonce,
            maxFeePerGas: maxFeePerGas,
            gasLimit: gasLimit,
            validator: validator,
            validationData: validationData,
            paymaster: paymaster,
            paymasterData: paymasterData,
            extraData: extraData
        });
    }
}
