// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Boop, ExecutionOutput} from "boop/interfaces/Types.sol";

/**
 * @dev Key used in {interfaces/Types.Boop}.extraData to specify a custom executor address (must
 * satisfy {interfaces/ICustomExecutor}).
 */
bytes3 constant EXECUTOR_KEY = 0x000002;

/**
 * Interface for custom validators that can be registered with Boop accounts implementing
 * {interfaces/IExtensibleAccount}, with extension type {interfaces/Types.ExtensionType}.Executor.
 */
interface ICustomExecutor {
    /// Same interface and specification as {interfaces/IAccount.execute}.
    function execute(Boop memory boop) external returns (ExecutionOutput memory output);
}
