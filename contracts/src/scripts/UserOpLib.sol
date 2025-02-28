// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {PackedUserOperation} from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";

library UserOpLib {
    function getEncodedUserOpHash(PackedUserOperation memory userOp) internal view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                keccak256(
                    abi.encodePacked(
                        userOp.sender,
                        userOp.nonce,
                        keccak256(userOp.initCode),
                        keccak256(userOp.callData),
                        userOp.accountGasLimits,
                        userOp.preVerificationGas,
                        userOp.gasFees,
                        keccak256(userOp.paymasterAndData)
                    )
                ),
                address(0x0000000071727De22E5E9d8BAf0edAc6f37da032), // ENTRYPOINT_V7
                block.chainid
            )
        );
    }
}
