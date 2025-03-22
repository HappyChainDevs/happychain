// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../../core/HappyTx.sol";
import {ExecutionOutput} from "../../interfaces/IHappyAccount.sol";

/// Interface for custom validators that can be registered with Boop accounts implementing
/// {IExtensibleBoopAccount}, with extension type {ExtensionType.Executor}.
interface ICustomBoopExecutor {
    /// Same interface and specification as {IBoopAccount.execute}.
    function execute(HappyTx memory happyTx) external returns (ExecutionOutput memory output);
}
