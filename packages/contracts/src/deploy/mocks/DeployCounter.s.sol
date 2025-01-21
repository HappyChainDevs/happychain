// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyCounter} from "../../mocks/HappyCounter.sol";
import {BaseDeployScript} from "../BaseDeployScript.sol";

contract DeployHappyCounter is BaseDeployScript {
    bytes32 public constant DEPLOYMENT_SALT = bytes32(uint256(13));

    HappyCounter public counter;

    function deploy() internal override {
        counter = new HappyCounter();
        deployed("++:)", "HappyCounter", address(counter));
    }
}
