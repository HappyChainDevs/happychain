// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {IHappyAccount} from "../IHappyAccount.sol";

enum ExtensionType {
    Validator,
    Executor
}

/// Selector returned if the extension is already registered.
error ExtensionAlreadyRegistered(address extension, ExtensionType extensionType);

/// Selector returned if the extension is not registered.
error ExtensionNotRegistered(address extension, ExtensionType extensionType);

/// Selector returned by account functions if an extension is specified for use in extraData, but
/// the extension isn't registered in the account.
error ExtensionNotFound(address extension, ExtensionType extensionType);

/// Selector returned by extension functions and account functions if an extraData value read by an
/// extension is invalid.
error InvalidExtensionValue(ExtensionType extensionType);

/// Interface for Boop accounts (as specified in IHappyAccount) that are extensible with validator
/// and executor extensions.
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
}
