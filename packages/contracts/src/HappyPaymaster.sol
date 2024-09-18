// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {IEntryPoint} from "account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {BasePaymaster} from "account-abstraction/contracts/core/BasePaymaster.sol";
import {PackedUserOperation} from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {UserOperationLib} from "account-abstraction/contracts/core/UserOperationLib.sol";

import {_packValidationData} from "account-abstraction/contracts/core/Helpers.sol";

contract HappyPaymaster is BasePaymaster {
    using UserOperationLib for PackedUserOperation;

    constructor(address _entryPoint) BasePaymaster(IEntryPoint(_entryPoint)) {}

    function _validatePaymasterUserOp(
        PackedUserOperation calldata, /*userOp*/
        bytes32, /*userOpHash*/
        uint256 /*requiredPreFund*/
    ) internal pure override returns (bytes memory context, uint256 validationData) {
        return ("", _packValidationData(false, 0, 0));
    }
}
