// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.28;

import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {HappyAccount} from "boop/happychain/HappyAccount.sol";

contract HappyAccountUUPSProxy is HappyAccount, UUPSUpgradeable {
    constructor(address entrypoint) HappyAccount(entrypoint) UUPSUpgradeable() {}

    /// @dev Function that authorizes an upgrade of this contract via the UUPS proxy pattern
    function _authorizeUpgrade(address newImplementation) internal override onlySelfOrOwner {}
}
