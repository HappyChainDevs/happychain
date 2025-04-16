// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {IAccount} from "boop/interfaces/IAccount.sol";
import {CallInfo, ExtensionType} from "boop/interfaces/Types.sol";

/**
 * Interface for Boop accounts (as specified in IAccount) that are extensible with validator
 * and executor extensions.
 *
 * The ERC-165 selector for this interface is 0x5c5d715d and can be obtained via:
 * ```
 * console.logBytes4(
 *     IAccount.validate.selector
 *     ^ IAccount.execute.selector
 *     ^ IExtensibleAccount.addExtension.selector
 *     ^ IExtensibleAccount.removeExtension.selector
 *     ^ IExtensibleAccount.isExtensionRegistered.selector
 *     ^ IExtensibleAccount.executeCallFromExecutor.selector
 * );
 * ```
 */
interface IExtensibleAccount is IAccount {
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
     * {IAccount.execute}, and check that variable here.
     */
    function executeCallFromExecutor(CallInfo memory info) external returns (bool success, bytes memory returnData);
}
