// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../../core/HappyTx.sol";

/// Interface for custom boop validators.
interface ICustomBoopValidator {
    function validate(HappyTx memory happyTx) external returns (bytes4);
}
