// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {console} from "forge-std/Script.sol";
import {UserOpLib} from "./UserOpLib.sol";
import {PackedUserOperation as PO} from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";

import {ECDSA} from "solady/utils/ECDSA.sol";
import {IValidator} from "kernel/interfaces/IERC7579Modules.sol";
import {PackedUserOperation} from "kernel/interfaces/PackedUserOperation.sol";

import {
    ERC1271_MAGICVALUE,
    ERC1271_INVALID,
    MODULE_TYPE_VALIDATOR,
    SIG_VALIDATION_SUCCESS_UINT,
    SIG_VALIDATION_FAILED_UINT
} from "kernel/types/Constants.sol";
import {UserOpLib} from "./UserOpLib.sol";

    struct SessionKeyValidatorStorage {
    address sessionKey;
}

contract SessionKeyValidator is IValidator {
    mapping(address => SessionKeyValidatorStorage) public sessionKeyValidatorStorage;

    function onInstall(bytes calldata _data) external payable override {
        address sessionKey = address(bytes20(_data[0:20]));
        sessionKeyValidatorStorage[msg.sender].sessionKey = sessionKey;
    }

    function onUninstall(bytes calldata) external payable override {
        delete sessionKeyValidatorStorage[msg.sender];
    }

    function isModuleType(uint256 typeID) external pure override returns (bool) {
        return typeID == MODULE_TYPE_VALIDATOR;
    }

    function isInitialized(address smartAccount) external view override returns (bool) {
        return sessionKeyValidatorStorage[smartAccount].sessionKey != address(0);
    }

    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash)
        external
        payable
        override
        returns (uint256)
    {
        address sessionKey = sessionKeyValidatorStorage[msg.sender].sessionKey;
        console.log("SessionKeyValidator.ValidateUserOp: Stored SessionKey = ", sessionKey);

        bytes calldata sig = userOp.signature;
        address recoveredAddress = ECDSA.recover(userOpHash, sig);
        console.log("SessionKeyValidator.ValidateUserOp: Recovered address = ", recoveredAddress);

        console.log("UserOp details:");
//        console.log("Sender:");
//        console.logAddress(userOp.sender);
//        console.log("Nonce:");
//        console.logUint(userOp.nonce);
//        console.log("InitCode:");
//        console.logBytes(userOp.initCode);
//        console.log("CallData:");
//        console.logBytes(userOp.callData);
//        console.log("AccountGasLimits:");
//        console.logBytes32(userOp.accountGasLimits);
//        console.log("PreVerificationGas:");
//        console.logUint(userOp.preVerificationGas);
//        console.log("GasFees:");
//        console.logBytes32(userOp.gasFees);
//        console.log("paymasterAndData:");
//        console.logBytes(userOp.paymasterAndData);
//        console.log("Signature:");
//        console.logBytes(sig);

        console.log("UserOpHash:");
        console.logBytes32(userOpHash);
        console.log("userOp.hash: ");

        PO memory uOp = PO({
            sender: userOp.sender,
            nonce: userOp.nonce,
            initCode: userOp.initCode,
            callData: userOp.callData,
            accountGasLimits: userOp.accountGasLimits,
            preVerificationGas: userOp.preVerificationGas,
            gasFees: userOp.gasFees,
            paymasterAndData: userOp.paymasterAndData,
            signature: userOp.signature
        });

        bytes32 uHash = UserOpLib.hash(uOp);
        console.logBytes32(uHash);
        console.log("getUserOpHash(uOp): ");
        bytes32 getHash = keccak256(abi.encode(uHash, address(0x0000000071727De22E5E9d8BAf0edAc6f37da032), block.chainid));
        console.logBytes32(getHash);

    if (sessionKey == recoveredAddress) {
            return SIG_VALIDATION_SUCCESS_UINT;
        }

        return SIG_VALIDATION_FAILED_UINT;
    }

    function isValidSignatureWithSender(address, bytes32 hash, bytes calldata sig)
        external
        view
        override
        returns (bytes4)
    {
        address sessionKey = sessionKeyValidatorStorage[msg.sender].sessionKey;
        if (sessionKey == ECDSA.recover(hash, sig)) {
            return ERC1271_MAGICVALUE;
        }
        bytes32 ethHash = ECDSA.toEthSignedMessageHash(hash);
        address recovered = ECDSA.recover(ethHash, sig);
        if (sessionKey != recovered) {
            return ERC1271_INVALID;
        }
        return ERC1271_MAGICVALUE;
    }
}
