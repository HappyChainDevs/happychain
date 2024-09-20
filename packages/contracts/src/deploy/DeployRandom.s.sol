// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {BaseDeployScript} from "./BaseDeployScript.sol";
import {Random} from "../Random.sol";

/**
 * @dev Deploys the Randomness contract.
 */
contract DeployL1 is BaseDeployScript {
    Random public random;

    function deploy() internal override {
        random = new Random();
        deployed("Random", address(random));
    }
}
