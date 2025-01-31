// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {BaseDeployScript} from "./BaseDeployScript.sol";
import {Config} from "../Config.sol";

/**
 * @dev Deploys the Config contract.
 */
contract DeployConfig is BaseDeployScript {
    bytes32 public constant DEPLOYMENT_SALT = bytes32(uint256(8));
    address public constant random = 0xd7D1be22f2d14327c07b6669C91773BB23aABa9c;
    Config public config;

    function deploy() internal override {
        (address _config,) =
            deployDeterministic("Config", type(Config).creationCode, abi.encode(random), DEPLOYMENT_SALT);
        config = Config(_config);
        deployed("Config", address(config));
    }
}
