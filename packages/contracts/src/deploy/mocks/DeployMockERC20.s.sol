// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {MockERC20Token} from "../../mocks/MockERC20.sol";
import {BaseDeployScript} from "../BaseDeployScript.sol";

/**
 * @dev Deploys MockERC20Token contract for testing purposes.
 */
contract DeployMockERC20 is BaseDeployScript {
    bytes32 public constant DEPLOYMENT_SALT = 0;

    MockERC20Token public mockToken;

    function deploy() internal override {
        mockToken = new MockERC20Token{salt: DEPLOYMENT_SALT}();
        deployed("MockERC20Token", address(mockToken));
    }
}
