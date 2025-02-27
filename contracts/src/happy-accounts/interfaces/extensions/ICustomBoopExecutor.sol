// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../../core/HappyTx.sol";
import {ExecutionOutput} from "../../interfaces/IHappyAccount.sol";

/// Interface for custom boop executors.
interface ICustomBoopExecutor {
    function execute(HappyTx memory happyTx) external returns (ExecutionOutput memory output);
}
