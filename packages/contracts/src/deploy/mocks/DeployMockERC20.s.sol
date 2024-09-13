// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {MockHappyToken} from "../../mocks/MockHappyERC20.sol";
import {BaseDeployScript} from "../BaseDeployScript.sol";

contract DeployMockERC20 is BaseDeployScript {
    MockHappyToken public happyToken;

    function deploy() internal override {
        happyToken = new MockHappyToken{salt: 0}();
        deployed("MockHappyToken", address(happyToken));
    }
}