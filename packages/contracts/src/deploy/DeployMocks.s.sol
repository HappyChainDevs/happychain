// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {MockERC20Token} from "../mocks/MockERC20.sol";
import {BaseDeployScript} from "./BaseDeployScript.sol";
import {HappyCounter} from "../mocks/HappyCounter.sol";

/**
 * @dev Deploys mock contracts for testing purposes.
 */
contract DeployMockERC20 is BaseDeployScript {
    // Every token uses the same contract, and so needs a different salt.
    bytes32 public constant SALT_TOKEN_A = bytes32(uint256(0));
    bytes32 public constant SALT_TOKEN_B = bytes32(uint256(1));
    bytes32 public constant SALT_TOKEN_C = bytes32(uint256(2));

    MockERC20Token public mockTokenA;
    MockERC20Token public mockTokenB;
    MockERC20Token public mockTokenC;
    HappyCounter public happyCounter;

    function deploy() internal override {
        deployMockToken("MockTokenA", "MTA", SALT_TOKEN_A);
        deployMockToken("MockTokenB", "MTB", SALT_TOKEN_B);
        deployMockToken("MockTokenC", "MTC", SALT_TOKEN_C);
        deployDeterministic("HappyCounter", type(HappyCounter).creationCode, abi.encode(), bytes32(uint256(0)));
    }

    function deployMockToken(string memory name, string memory symbol, bytes32 salt) internal {
        deployDeterministic(
            name, "MockERC20Token", type(MockERC20Token).creationCode, abi.encode(name, symbol, uint8(18)), salt
        );
    }
}
