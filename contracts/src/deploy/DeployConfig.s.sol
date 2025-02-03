// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {BaseDeployScript} from "./BaseDeployScript.sol";
import {Config} from "../Config.sol";

/**
 * @dev Deploys the Config contract.
 */
contract DeployConfig is BaseDeployScript {
    bytes32 public constant DEPLOYMENT_SALT = bytes32(uint256(8));
    address public constant random = 0xF13b26BD65d4026818698d243195C0b2D09883c2;
    Config public config;

    function deploy() internal override {
        address owner = vm.envAddress("CONFIG_OWNER");
        (address _config,) =
            deployDeterministic("Config", type(Config).creationCode, abi.encode(owner, random), DEPLOYMENT_SALT);
        config = Config(_config);
        deployed("Config", address(config));
    }
}
