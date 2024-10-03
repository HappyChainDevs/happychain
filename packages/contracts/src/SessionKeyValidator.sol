// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

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
        bytes32 ethHash = ECDSA.toEthSignedMessageHash(userOpHash);

        /**
         * Note: Although this logic could be refactored to call @isValidSignatureWithSender,
         * we avoid the additional function call here due to gas efficiency concerns,
         * as this function is frequently executed.
         */
        if (sessionKey == ECDSA.recover(ethHash, userOp.signature)) {
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
        bytes32 ethHash = ECDSA.toEthSignedMessageHash(hash);
        if (sessionKey != ECDSA.recover(ethHash, sig)) {
            return ERC1271_INVALID;
        }

        return ERC1271_MAGICVALUE;
    }
}
