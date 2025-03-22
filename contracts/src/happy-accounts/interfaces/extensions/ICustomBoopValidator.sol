// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../../core/HappyTx.sol";

/// Interface for custom validators that can be registered with Boop accounts implementing
/// {IExtensibleBoopAccount}, with extension type {ExtensionType.Validator}.
interface ICustomBoopValidator {
    /// Same interface and specification as {IBoopAccount.validate}.
    function validate(HappyTx memory happyTx) external returns (bytes4);
}
