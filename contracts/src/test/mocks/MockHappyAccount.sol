// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {IHappyAccount, ExecutionOutput} from "boop/interfaces/IHappyAccount.sol";
import {
    IExtensibleBoopAccount,
    ExtensionType,
    ExtensionAlreadyRegistered,
    ExtensionNotRegistered,
    CallInfo
} from "boop/interfaces/extensions/IExtensibleBoopAccount.sol";
import {HappyTx} from "boop/core/HappyTx.sol";
import {CallInfo} from "boop/libs/CallInfoCodingLib.sol";
import {CallStatus} from "boop/core/HappyEntryPoint.sol";

/**
 * Mock implementation of IHappyAccount and IExtensibleBoopAccount for testing purposes.
 * This mock provides stub implementations of all required functions and a simplified
 * executeCallFromExecutor function without the sender check.
 */
contract MockHappyAccount is IHappyAccount, IExtensibleBoopAccount {
    // Track registered extensions
    mapping(ExtensionType => mapping(address => bool)) public extensions;

    function executeCallFromExecutor(CallInfo memory info) external returns (bool success, bytes memory returnData) {
        // No sender check, unlike the real implementation
        return info.dest.call{value: info.value}(info.callData);
    }

    function validate(HappyTx memory /*happyTx*/ ) external pure returns (bytes memory) {
        return "";
    }

    function execute(HappyTx memory /*happyTx*/ ) external pure returns (ExecutionOutput memory output) {
        output.status = CallStatus.SUCCEEDED;
        return output;
    }

    function payout(uint256 amount) external {
        (payable(tx.origin).call{value: amount}(""));
    }

    function isValidSignature(bytes32, /*hash*/ bytes memory /*signature*/ )
        external
        pure
        returns (bytes4 magicValue)
    {
        return 0x1626ba7e;
    }

    function supportsInterface(bytes4 /*interfaceID*/ ) external pure returns (bool) {
        return true;
    }

    function addExtension(address extension, ExtensionType extensionType) external {
        if (extensions[extensionType][extension]) {
            revert ExtensionAlreadyRegistered(extension, extensionType);
        }
        extensions[extensionType][extension] = true;
        emit ExtensionAdded(extension, extensionType);
    }

    function removeExtension(address extension, ExtensionType extensionType) external {
        if (!extensions[extensionType][extension]) {
            revert ExtensionNotRegistered(extension, extensionType);
        }
        delete extensions[extensionType][extension];
        emit ExtensionRemoved(extension, extensionType);
    }

    function isExtensionRegistered(address extension, ExtensionType extensionType) external view returns (bool) {
        return extensions[extensionType][extension];
    }

    receive() external payable {}
}
