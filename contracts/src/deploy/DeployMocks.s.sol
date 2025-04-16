// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {BaseDeployScript} from "src/deploy/BaseDeployScript.sol";
import {MockGasBurner} from "src/mocks/GasBurner.sol";
import {HappyCounter} from "src/mocks/HappyCounter.sol";
import {MockERC20} from "src/mocks/MockERC20.sol";
import {MockRevert} from "src/mocks/MockRevert.sol";

/**
 * @dev Deploys mock contracts for testing purposes.
 */
contract DeployMockERC20 is BaseDeployScript {
    // Every token uses the same contract, and so needs a different salt.
    bytes32 public constant SALT_TOKEN_A = bytes32(uint256(0));
    bytes32 public constant SALT_TOKEN_B = bytes32(uint256(1));
    bytes32 public constant SALT_TOKEN_C = bytes32(uint256(2));

    MockERC20 public mockTokenA;
    MockERC20 public mockTokenB;
    MockERC20 public mockTokenC;
    HappyCounter public happyCounter;
    MockRevert public mockRevert;
    MockGasBurner public mockGasBurner;

    function deploy() internal override {
        mockTokenA = deployMockToken("MockTokenA", "MTA", SALT_TOKEN_A);
        mockTokenB = deployMockToken("MockTokenB", "MTB", SALT_TOKEN_B);
        mockTokenC = deployMockToken("MockTokenC", "MTC", SALT_TOKEN_C);
        (address _happyCounter,) =
            deployDeterministic("HappyCounter", type(HappyCounter).creationCode, abi.encode(), bytes32(uint256(0)));
        happyCounter = HappyCounter(_happyCounter);
        (address _mockRevert,) =
            deployDeterministic("MockRevert", type(MockRevert).creationCode, abi.encode(), bytes32(uint256(0)));
        (address _mockGasBurner,) =
            deployDeterministic("MockGasBurner", type(MockGasBurner).creationCode, abi.encode(), bytes32(uint256(0)));
        mockRevert = MockRevert(_mockRevert);
        mockGasBurner = MockGasBurner(_mockGasBurner);
    }

    function deployMockToken(string memory name, string memory symbol, bytes32 salt) internal returns (MockERC20) {
        (address addr,) = deployDeterministic(
            name, "MockERC20", type(MockERC20).creationCode, abi.encode(name, symbol, uint8(18)), salt
        );
        return MockERC20(addr);
    }
}
