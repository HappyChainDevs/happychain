// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {BaseDeployScript} from "./BaseDeployScript.sol";
import {MockERC20Token} from "../mocks/MockERC20.sol";
import {HappyCounter} from "../mocks/HappyCounter.sol";

/**
 * @dev Deploys mock contracts for testing purposes.
 */
contract DeployMocks is BaseDeployScript {
    // Mock tokens share the same contract, they require different salts.
    bytes32 public constant DEPLOYMENT_SALT_TOKEN_A = bytes32(uint256(0));
    bytes32 public constant DEPLOYMENT_SALT_TOKEN_B = bytes32(uint256(1));
    bytes32 public constant DEPLOYMENT_SALT_TOKEN_C = bytes32(uint256(2));

    bytes32 public constant DEPLOYMENT_SALT_COUNTER = bytes32(uint256(0));

    MockERC20Token public mockTokenA;
    MockERC20Token public mockTokenB;
    MockERC20Token public mockTokenC;
    HappyCounter public counter;

    function deploy() internal override {
        deployMockToken("MockTokenA", "MTA", DEPLOYMENT_SALT_TOKEN_A);
        deployMockToken("MockTokenB", "MTB", DEPLOYMENT_SALT_TOKEN_B);
        deployMockToken("MockTokenC", "MTC", DEPLOYMENT_SALT_TOKEN_C);
        deployDeterministic("HappyCounter", type(HappyCounter).creationCode, bytes(""), DEPLOYMENT_SALT_COUNTER);
    }

    function deployMockToken(string memory name, string memory symbol, bytes32 salt) internal {
        deployDeterministic(
            name, "MockERC20Token", type(MockERC20Token).creationCode, abi.encode(name, symbol, 18), salt
        );
    }
}
