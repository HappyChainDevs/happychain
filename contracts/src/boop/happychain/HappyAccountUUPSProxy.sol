// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.28;

import {HappyAccount} from "boop/happychain/HappyAccount.sol";
import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract HappyAccountUUPSProxy is HappyAccount, UUPSUpgradeable {
    constructor(address entrypoint) HappyAccount(entrypoint) UUPSUpgradeable() {}

    /// @dev Function that authorizes an upgrade of this contract via the UUPS proxy pattern
    function _authorizeUpgrade(address newImplementation) internal override onlySelfOrOwner {}
}
