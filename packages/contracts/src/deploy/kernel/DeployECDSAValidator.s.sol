// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {console} from "forge-std/console.sol";
import {BaseDeployScript} from "../BaseDeployScript.sol";
import {ECDSAValidator} from "kernel/validator/ECDSAValidator.sol";

/**
 * @dev Deploys the ECDSAValidtor Contract for kernel smart accounts
 */
contract DeployECDSAValidator is BaseDeployScript {
    ECDSAValidator public validator;

    function deploy() internal override {
        validator = new ECDSAValidator{salt: 0}();
        console.log("Validator deployed at: ");
        console.logAddress(address(validator));
        deployed("ECDSAValidator", "ECDSAValidator", address(validator));
    }
}
