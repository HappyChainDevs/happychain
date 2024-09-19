// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {MockERC20Token} from "../../mocks/MockERC20.sol";
import {BaseDeployScript} from "../BaseDeployScript.sol";

/**
 * @dev Deploys mock contracts for testing purposes.
 */
contract DeployMockERC20 is BaseDeployScript {
    bytes32 public constant DEPLOYMENT_SALT_1 = bytes32(uint256(0));
    bytes32 public constant DEPLOYMENT_SALT_2 = bytes32(uint256(1));
    bytes32 public constant DEPLOYMENT_SALT_3 = bytes32(uint256(2));

    MockERC20Token public mockTokenA;
    MockERC20Token public mockTokenB;
    MockERC20Token public mockTokenC;

    function deploy() internal override {
        mockTokenA = new MockERC20Token{salt: DEPLOYMENT_SALT_1}("MockTokenA", "MTA", 18);
        deployed("MockTokenA", "MockERC20Token", address(mockTokenA));

        mockTokenB = new MockERC20Token{salt: DEPLOYMENT_SALT_2}("MockTokenB", "MTB", 18);
        deployed("MockTokenB", "MockERC20Token", address(mockTokenB));

        mockTokenC = new MockERC20Token{salt: DEPLOYMENT_SALT_3}("MockTokenC", "MTC", 18);
        deployed("MockTokenC", "MockERC20Token", address(mockTokenC));
    }
}
