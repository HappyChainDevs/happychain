// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {MockHappyToken} from "../../mocks/MockHappyERC20.sol";
import {BaseDeployScript} from "../BaseDeployScript.sol";

/**
 * @dev Deploys the MockHappyToken contract for testing purposes.
 */
contract DeployMockERC20 is BaseDeployScript {
    bytes32 public constant DEPLOYMENT_SALT = 0;

    MockHappyToken public mockHappyToken;

    function deploy() internal override {
        mockHappyToken = new MockHappyToken{salt: DEPLOYMENT_SALT}();
        deployed("MockHappyToken", address(mockHappyToken));
    }
}
