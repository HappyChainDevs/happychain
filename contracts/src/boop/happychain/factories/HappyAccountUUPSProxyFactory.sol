// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {HappyAccountFactoryBase} from "boop/happychain/factories/HappyAccountFactoryBase.sol";
import {HappyAccount} from "boop/happychain/HappyAccount.sol";
import {HappyAccountUUPSProxy} from "boop/happychain/HappyAccountUUPSProxy.sol";

/**
 * Factory contract for deploying deterministic ERC1967 proxies for {happychain/HappyAccount}.
 */
contract HappyAccountUUPSProxyFactory is HappyAccountFactoryBase {
    /// The implementation contract that all proxies will delegate to {happychain/HappyAccount}.
    address public immutable ACCOUNT_IMPLEMENTATION;

    // ====================================================================================================
    // CONSTRUCTOR

    constructor(address accountImplementation, address happyAccountRegistry)
        HappyAccountFactoryBase(happyAccountRegistry)
    {
        ACCOUNT_IMPLEMENTATION = accountImplementation;
    }

    function getAccountImplementation(address payable account) external view override returns (address) {
        require(HAPPY_ACCOUNT_REGISTRY.registeredAccounts(account) == address(this), "Not a registered account");
        return HappyAccountUUPSProxy(account).getImplementation();
    }

    function getProxyCreationCode() external pure override returns (bytes memory) {
        return type(ERC1967Proxy).creationCode;
    }

    /// @dev Prepares the contract creation code for ERC1967Proxy contract.
    function _prepareContractCode(address owner) internal view override returns (bytes memory) {
        bytes memory creationCode = type(ERC1967Proxy).creationCode;
        bytes memory initData = abi.encodeCall(HappyAccount.initialize, (owner));
        bytes memory constructorArgs = abi.encode(ACCOUNT_IMPLEMENTATION, initData);
        return abi.encodePacked(creationCode, constructorArgs);
    }
}
