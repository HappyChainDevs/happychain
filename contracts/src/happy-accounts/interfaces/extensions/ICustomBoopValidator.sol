// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "boop/core/HappyTx.sol";

/**
 * @dev Key used in {HappyTx.extraData} to specify a custom validator address (must satisfy
 * {ICustomBoopValidator}), to be looked up by {IHappyAccount.validate} implementations.
 */
bytes3 constant VALIDATOR_KEY = 0x000001;

/**
 * Interface for custom validators that can be registered with Boop accounts implementing
 * {IExtensibleBoopAccount}, with extension type {ExtensionType.Validator}.
 */
interface ICustomBoopValidator {
    /// Same interface and specification as {IBoopAccount.validate}.
    function validate(HappyTx memory happyTx) external returns (bytes memory);
}
