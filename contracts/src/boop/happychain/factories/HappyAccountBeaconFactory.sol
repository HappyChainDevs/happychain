// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

import {HappyAccount} from "boop/happychain/HappyAccount.sol";
import {HappyAccountFactoryBase} from "boop/happychain/factories/HappyAccountFactoryBase.sol";

/**
 * Factory contract for deploying deterministic ERC1967 proxies for {HappyAccount}.
 */
contract HappyAccountBeaconFactory is HappyAccountFactoryBase {

    /// The implementation contract that all proxies will delegate to {HappyAccount}.
    address public immutable ACCOUNT_BEACON;

    // ====================================================================================================
    // CONSTRUCTOR

    constructor(address beacon) {
        ACCOUNT_BEACON = beacon;
    }

    /// @dev Prepares the contract creation code for ERC1967Proxy contract.
    function _prepareContractCode(address owner) internal view override returns (bytes memory) {
        bytes memory creationCode = type(BeaconProxy).creationCode;
        bytes memory initData = abi.encodeCall(HappyAccount.initialize, (owner));
        bytes memory constructorArgs = abi.encode(ACCOUNT_BEACON, initData);
        return abi.encodePacked(creationCode, constructorArgs);
    }
}
