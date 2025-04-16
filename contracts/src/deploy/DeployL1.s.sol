// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {BaseDeployScript} from "src/deploy/BaseDeployScript.sol";
import {HappyERC20} from "src/HappyERC20.sol";

/**
 * @dev Deploys the HappyERC20 contract.
 */
contract DeployL1 is BaseDeployScript {
    HappyERC20 public happyERC20;

    function deploy() internal override {
        happyERC20 = new HappyERC20();
        deployed("HappyERC20", address(happyERC20));
    }
}
