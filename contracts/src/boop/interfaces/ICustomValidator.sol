// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Boop} from "boop/interfaces/Types.sol";

/**
 * @dev Key used in {interfaces/Types.Boop}.extraData to specify a custom validator address (must
 * satisfy {interfaces/ICustomValidator}), to be looked up by {interfaces/IExtensibleAccount.validate}
 * implementations.
 */
bytes3 constant VALIDATOR_KEY = 0x000001;

/**
 * Interface for custom validators that can be registered with Boop accounts implementing
 * {interfaces/IExtensibleAccount}, with extension type {interfaces/Types.ExtensionType}.Validator.
 */
interface ICustomValidator {
    /// Same interface and specification as {interfaces/IAccount.validate}.
    function validate(Boop memory boop) external returns (bytes memory);
}
