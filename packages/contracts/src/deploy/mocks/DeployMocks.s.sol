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
        mockTokenA = new MockERC20Token{salt: DEPLOYMENT_SALT_1}("MockERC20A", "MTA", 18);
        deployed("MockERC20A", "MockERC20Token", address(mockTokenA));

        mockTokenB = new MockERC20Token{salt: DEPLOYMENT_SALT_2}("MockERC20B", "MTB", 18);
        deployed("MockERC20B", "MockERC20Token", address(mockTokenB));

        mockTokenC = new MockERC20Token{salt: DEPLOYMENT_SALT_3}("MockERC20C", "MTC", 18);
        deployed("MockERC20C", "MockERC20Token", address(mockTokenC));
    }
}
