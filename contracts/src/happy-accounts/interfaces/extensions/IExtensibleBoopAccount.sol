// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {IHappyAccount} from "boop/interfaces/IHappyAccount.sol";

enum ExtensionType {
    Validator,
    Executor
}

/**
 * Information (destination, value and calldata) for a call to be made by the account on behalf
 * of an execution extension.
 */
struct CallInfo {
    address dest;
    uint256 value;
    bytes callData;
}

/// Thrown when calling addExtension with an already-registered extension.
error ExtensionAlreadyRegistered(address extension, ExtensionType extensionType);

/// Thrown when calling removeExtension with an unregistered extension, or returned by account
/// functions if an extension is specified for use in the extraData, but isn't registered.
error ExtensionNotRegistered(address extension, ExtensionType extensionType);

/// Selector returned by extension functions and account functions if an extraData value read by an
/// extension is invalid.
error InvalidExtensionValue();

/**
 * Interface for Boop accounts (as specified in IHappyAccount) that are extensible with validator
 * and executor extensions.
 *
 * The ERC-165 selector for this interface is 0xf0223481 and can be obtained via: todo: Update
 * ```
 * console.logBytes4(
 *     IHappyAccount.validate.selector
 *     ^ IHappyAccount.execute.selector
 *     ^ IExtensibleBoopAccount.addExtension.selector
 *     ^ IExtensibleBoopAccount.removeExtension.selector
 *     ^ IExtensibleBoopAccount.isExtensionRegistered.selector
 *     ^ IExtensibleBoopAccount.executeCallFromExecutor.selector
 * );
 * ```
 */
interface IExtensibleBoopAccount is IHappyAccount {
    // ====================================================================================================
    // EVENTS

    /// Emitted when an extension is added to the account
    event ExtensionAdded(address indexed extension, ExtensionType indexed extensionType);

    /// Emitted when an extension is removed from the account
    event ExtensionRemoved(address indexed extension, ExtensionType indexed extensionType);

    // ====================================================================================================
    // FUNCTIONS

    /// Adds an extension to the account, can revert with ExtensionAlreadyRegistered.
    function addExtension(address extension, ExtensionType extensionType) external;

    /// Removes an extension from the account, can revert with ExtensionNotRegistered.
    function removeExtension(address extension, ExtensionType extensionType) external;

    /// Checks if an extension is already registered.
    function isExtensionRegistered(address extension, ExtensionType extensionType) external view returns (bool);

    /**
     * Performs a low-level call from the account on behalf of an executor extension.
     *
     * This must check that the call was made from a registered executor. It is recommended that the
     * account set a transient variable to the executor that was dispatched in
     * {IHappyAccount.execute}, and check that variable here.
     */
    function executeCallFromExecutor(CallInfo memory info) external returns (bool success, bytes memory returnData);
}
