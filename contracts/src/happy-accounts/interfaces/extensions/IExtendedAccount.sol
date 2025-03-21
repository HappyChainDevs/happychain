// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

enum ExtensionType {
    Validator,
    Executor
}

/// Selector returned if the extension is not found for the given account.
error ExtensionNotFound(address extension, ExtensionType extensionType);

/// Selector returned if the extension is already registered.
error ExtensionAlreadyRegistered(address extension, ExtensionType extensionType);

/// Selector returned if the extension is not registered.
error ExtensionNotRegistered(address extension, ExtensionType extensionType);

/// Revert with this error if the extension's value is invalid.
error InvalidExtensionValue(ExtensionType extensionType);

interface IExtendedAccount {
    // ====================================================================================================
    // EVENTS

    /// Emitted when an extension is added to the account
    event ExtensionAdded(address indexed extension, ExtensionType indexed extensionType);

    /// Emitted when an extension is removed from the account
    event ExtensionRemoved(address indexed extension, ExtensionType indexed extensionType);

    // ====================================================================================================
    // FUNCTIONS

    /// Adds an extension to the account.
    function addExtension(address extension, ExtensionType extensionType) external;

    /// Removes an extension from the account.
    function removeExtension(address extension, ExtensionType extensionType) external;

    /// Checks if an extension is already registered.
    function isExtensionRegistered(address extension, ExtensionType extensionType) external view returns (bool);
}
