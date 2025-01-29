// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {BaseDeployScript} from "./BaseDeployScript.sol";
import {Random} from "../Random.sol";

/**
 * @dev Deploys the Randomness contract.
 */
contract DeployL1 is BaseDeployScript {
    bytes32 public constant DEPLOYMENT_SALT = bytes32(uint256(0));

    Random public random;

    function deploy() internal override {
        (address _random,) = deployDeterministic("Random", type(Random).creationCode, abi.encode(), DEPLOYMENT_SALT);
        random = Random(_random);
    }
}
