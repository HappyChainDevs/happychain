// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {LibClone} from "solady/utils/LibClone.sol";
import {ScrappyAccount} from "../samples/ScrappyAccount.sol";

/**
 * @title  ScrappyAccountFactory
 * @dev    Example factory contract for deploying minimal deterministic ERC1967 proxies for {ScrappyAccount}.
 */
contract ScrappyAccountFactory {
    /// @dev Error thrown when account initialization fails
    error InitializeError();

    /// @dev Error thrown when attempting to deploy to an address that already has code
    error AlreadyDeployed();

    /// @dev The implementation contract that all proxies will delegate to {ScrappyAccount}.
    address public immutable ACCOUNT_IMPLEMENTATION;

    constructor(address accountImplementation) {
        ACCOUNT_IMPLEMENTATION = accountImplementation;
    }

    /**
     * @dev   Creates a new HappyAccount proxy
     * @param salt A unique salt for deterministic deployment
     * @param owner The address of the owner of the account
     */
    function createAccount(bytes32 salt, address owner) public payable returns (address) {
        (bool alreadyDeployed, address account) =
            LibClone.createDeterministicERC1967(msg.value, ACCOUNT_IMPLEMENTATION, salt);

        if (alreadyDeployed) {
            revert AlreadyDeployed();
        }

        ScrappyAccount(payable(account)).initialize(owner);
        return account;
    }

    /**
     * @dev   Predicts the address where a HappyAccount would be deployed
     * @param salt used for deterministic deployment
     */
    function getAddress(bytes32 salt) public view returns (address) {
        return LibClone.predictDeterministicAddressERC1967(ACCOUNT_IMPLEMENTATION, salt, address(this));
    }
}
