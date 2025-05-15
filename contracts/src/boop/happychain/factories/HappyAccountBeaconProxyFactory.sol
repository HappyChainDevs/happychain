// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import {UpgradeableBeacon} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import {HappyAccountFactoryBase} from "boop/happychain/factories/HappyAccountFactoryBase.sol";
import {HappyAccount} from "boop/happychain/HappyAccount.sol";

/**
 * Factory contract for deploying deterministic Beacon based ERC1967 proxies for {happychain/HappyAccount}.
 */
contract HappyAccountBeaconProxyFactory is HappyAccountFactoryBase {
    /// The implementation contract that all proxies will delegate to {happychain/HappyAccount}.
    address public immutable ACCOUNT_BEACON;

    // ====================================================================================================
    // CONSTRUCTOR

    constructor(address beacon, address happyAccountRegistry) HappyAccountFactoryBase(happyAccountRegistry) {
        ACCOUNT_BEACON = beacon;
    }

    function getAccountImplementation() external view returns (address) {
        return UpgradeableBeacon(ACCOUNT_BEACON).implementation();
    }

    function getAccountImplementation(address payable) external view override returns (address) {
        return UpgradeableBeacon(ACCOUNT_BEACON).implementation();
    }

    function getProxyCreationCode() external pure override returns (bytes memory) {
        return type(BeaconProxy).creationCode;
    }

    /// @dev Prepares the contract creation code for a BeaconProxy contract.
    function _prepareContractCode(address owner) internal view override returns (bytes memory) {
        bytes memory creationCode = type(BeaconProxy).creationCode;
        bytes memory initData = abi.encodeCall(HappyAccount.initialize, (owner));
        bytes memory constructorArgs = abi.encode(ACCOUNT_BEACON, initData);
        return abi.encodePacked(creationCode, constructorArgs);
    }
}
