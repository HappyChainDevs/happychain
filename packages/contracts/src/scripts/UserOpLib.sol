// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {PackedUserOperation} from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";

library UserOpLib {
    address public constant ENTRYPOINT_V7 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;

    function encode(PackedUserOperation memory userOp) internal pure returns (bytes memory ret) {
        address sender = userOp.sender;
        uint256 nonce = userOp.nonce;
        bytes32 hashInitCode = keccak256(userOp.initCode);
        bytes32 hashCallData = keccak256(userOp.callData);
        bytes32 accountGasLimits = userOp.accountGasLimits;
        uint256 preVerificationGas = userOp.preVerificationGas;
        bytes32 gasFees = userOp.gasFees;
        bytes32 hashPaymasterAndData = keccak256(userOp.paymasterAndData);

        return abi.encode(
            sender,
            nonce,
            hashInitCode,
            hashCallData,
            accountGasLimits,
            preVerificationGas,
            gasFees,
            hashPaymasterAndData
        );
    }

    function hash(PackedUserOperation memory userOp) internal pure returns (bytes32) {
        return keccak256(encode(userOp));
    }

    function getEncodedUserOpHash(PackedUserOperation memory userOp) external view returns (bytes32) {
        bytes32 uHash = hash(userOp);
        return keccak256(abi.encode(uHash, ENTRYPOINT_V7, block.chainid));
    }
}
