// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../../core/HappyTx.sol";
import {ExecutionOutput} from "../../interfaces/IHappyAccount.sol";

/**
 * @dev Key used in {HappyTx.extraData} to specify a custom executor address (must satisfy
 * {ICustomBoopExecutor}), to be looked up by {IHappyAccount.execute} implementations.
 */
bytes3 constant EXECUTOR_KEY = 0x000002;

/**
 * Interface for custom validators that can be registered with Boop accounts implementing
 * {IExtensibleBoopAccount}, with extension type {ExtensionType.Executor}.
 */
interface ICustomBoopExecutor {
    /// Same interface and specification as {IBoopAccount.execute}.
    function execute(HappyTx memory happyTx) external returns (ExecutionOutput memory output);
}
