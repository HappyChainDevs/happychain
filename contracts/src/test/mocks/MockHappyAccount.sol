// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ExtensionAlreadyRegistered, ExtensionNotRegistered} from "boop/interfaces/EventsAndErrors.sol";
import {IExtensibleAccount} from "boop/interfaces/IExtensibleAccount.sol";
import {Boop, CallInfo, CallStatus, ExecutionOutput, ExtensionType} from "boop/interfaces/Types.sol";

/**
 * Mock implementation of IAccount and IExtensibleAccount for testing purposes.
 * This mock provides stub implementations of all required functions and a simplified
 * executeCallFromExecutor function without the sender check.
 */
contract MockHappyAccount is IExtensibleAccount {
    // Track registered extensions
    mapping(ExtensionType => mapping(address => bool)) public extensions;

    function executeCallFromExecutor(CallInfo memory info) external returns (bool success, bytes memory returnData) {
        // No sender check, unlike the real implementation
        return info.dest.call{value: info.value}(info.callData);
    }

    function validate(Boop memory /*boop*/ ) external pure returns (bytes memory) {
        return "";
    }

    function execute(Boop memory /*boop*/ ) external pure returns (ExecutionOutput memory output) {
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

    function addExtension(address extension, ExtensionType extensionType, bytes memory /*installData*/ ) external {
        if (extensions[extensionType][extension]) {
            revert ExtensionAlreadyRegistered(extension, extensionType);
        }
        extensions[extensionType][extension] = true;
        emit ExtensionAdded(extension, extensionType);
    }

    function removeExtension(address extension, ExtensionType extensionType, bytes memory /*uninstallData*/ )
        external
    {
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
