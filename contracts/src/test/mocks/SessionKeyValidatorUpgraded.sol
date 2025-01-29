// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {SessionKeyValidator} from "../../SessionKeyValidator.sol";

contract SessionKeyValidatorUpgraded is SessionKeyValidator {
    string public addedField;
    /// @custom:oz-upgrades-unsafe-allow constructor

    constructor() {
        _disableInitializers();
    }

    function reinitialize() external reinitializer(2) {
        addedField = "SessionKeyValidatorUpgraded";
    }
}
