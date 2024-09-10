// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

/**
 * SigningPaymaster Contract
 *
 * This contract is based on the VerifyingPaymaster contract from the eth-infinitism repository.
 * Original contract:
 *  https://github.com/eth-infinitism/account-abstraction/blob/v0.7.0/contracts/samples/VerifyingPaymaster.sol
 *
 * Modifications from the original VerifyingPaymaster:
 *
 * This version always approves transactions without any validation.
 * The signature, timestamp, or gas-related checks are removed.
 */
import {BasePaymaster, IEntryPoint} from "account-abstraction/contracts/core/BasePaymaster.sol";
import {PackedUserOperation} from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {UserOperationLib} from "account-abstraction/contracts/core/UserOperationLib.sol";

contract SigningPaymaster is BasePaymaster {
    using UserOperationLib for PackedUserOperation;

    address public immutable verifyingSigner;

    constructor(IEntryPoint _entryPoint) BasePaymaster(_entryPoint) {}

    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32, /*userOpHash*/
        uint256 requiredPreFund
    ) internal view override returns (bytes memory context, uint256 validationData) {
        return ("", _packValidationData(false, 0, 0));
    }
}
