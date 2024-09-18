// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {MockERC20Token} from "../../mocks/MockERC20ERC20.sol";
import {BaseDeployScript} from "../BaseDeployScript.sol";

/**
 * @dev Deploys the MockHappyToken contract for testing purposes.
 */
contract DeployMockERC20 is BaseDeployScript {
    bytes32 public constant DEPLOYMENT_SALT = 0;

    MockERC20Token public mockERC20;

    function deploy() internal override {
        mockERC20 = new MockERC20Token{salt: DEPLOYMENT_SALT}();
        deployed("MockERC20", address(mockERC20));
    }
}
