// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; // solhint-disable-line compiler-version

import {IValidator} from "kernel/interfaces/IERC7579Modules.sol";
import {PackedUserOperation} from "kernel/interfaces/PackedUserOperation.sol";
import {ERC1271_MAGICVALUE, MODULE_TYPE_VALIDATOR, SIG_VALIDATION_SUCCESS_UINT} from "kernel/types/Constants.sol";

contract SessionKeyValidator is IValidator {
    mapping(address => bool) public initialized;
    mapping(bytes32 => bool) public validSig;

    function onInstall(bytes calldata) external payable override {
        initialized[msg.sender] = true;
    }

    function onUninstall(bytes calldata) external payable override {
        initialized[msg.sender] = false;
    }

    function isModuleType(uint256 typeID) external pure override returns (bool) {
        return typeID == MODULE_TYPE_VALIDATOR;
    }

    function isInitialized(address smartAccount) external view returns (bool) {
        return initialized[smartAccount];
    }

    function validateUserOp(PackedUserOperation calldata, bytes32) external payable override returns (uint256) {
        return SIG_VALIDATION_SUCCESS_UINT;
    }

    function isValidSignatureWithSender(address, bytes32, bytes calldata) external pure override returns (bytes4) {
        return ERC1271_MAGICVALUE;
    }
}
