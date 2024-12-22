// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "./HappyTx.sol";

/**
 * @title  HappyTxLib
 * @dev    Library for encoding and decoding HappyTx structs.
 *         This is a placeholder implementation that will be replaced with
 *         proper MUD-style encoding for efficiency.
 */
library HappyTxLib {
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
