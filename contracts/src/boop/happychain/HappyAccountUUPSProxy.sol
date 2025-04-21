// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.28;

import {StorageSlot} from "@openzeppelin/contracts/utils/StorageSlot.sol";
import {HappyAccount} from "boop/happychain/HappyAccount.sol";
import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract HappyAccountUUPSProxy is HappyAccount, UUPSUpgradeable {
    constructor(address entrypoint) HappyAccount(entrypoint) UUPSUpgradeable() {}

    function getImplementation() external view returns (address) {
        return StorageSlot.getAddressSlot(bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1)).value;
    }

    /// @dev Function that authorizes an upgrade of this contract via the UUPS proxy pattern
    function _authorizeUpgrade(address newImplementation) internal override onlySelfOrOwner {}
}
