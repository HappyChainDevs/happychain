// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {LibClone} from "solady/utils/LibClone.sol";
import {ScrappyAccount} from "../samples/ScrappyAccount.sol";

/**
 * @title  ScrappyAccountFactory
 * @dev    Example factory contract for deploying deterministic ERC1967 proxies for {@link ScrappyAccount}.
 */
contract ScrappyAccountFactory {
    error InitializeError();
    error AlreadyDeployed();

    /// @dev The implementation contract that all proxies will delegate to {@link ScrappyAccount}.
    address public immutable ACCOUNT_IMPLEMENTATION;

    /// @dev The deterministic EntryPoint contract
    address private immutable ENTRYPOINT;

    /**
     * @dev Emitted when a new HappyAccount is created
     * @param account The address of the created account
     * @param salt The salt used to create the account
     */
    event HappyAccountCreated(address indexed account, bytes32 salt);

    constructor(address _accountImplementation, address _entryPoint) {
        ACCOUNT_IMPLEMENTATION = _accountImplementation;
        ENTRYPOINT = _entryPoint;
    }

    /**
     * @dev Creates a new HappyAccount proxy
     * @param initData The initialization data for the account
     * @param salt A unique salt for deterministic deployment
     * @return The address of the created account
     */
    function createAccount(bytes calldata initData, bytes32 salt, address owner) public payable returns (address) {
        bytes32 actualSalt = keccak256(abi.encodePacked(initData, salt));
        (bool alreadyDeployed, address account) =
            LibClone.createDeterministicERC1967(msg.value, ACCOUNT_IMPLEMENTATION, actualSalt);

        if (alreadyDeployed) {
            revert AlreadyDeployed();
        }

        ScrappyAccount(payable(account)).initialize(owner);
        emit HappyAccountCreated(account, salt);
        return account;
    }

    /**
     * @dev Predicts the address where a HappyAccount would be deployed
     * @param initData The initialization data that would be used
     * @param salt The salt that would be used
     * @return The predicted address
     */
    function getAddress(bytes calldata initData, bytes32 salt) public view returns (address) {
        bytes32 actualSalt = keccak256(abi.encodePacked(initData, salt));
        return LibClone.predictDeterministicAddressERC1967(ACCOUNT_IMPLEMENTATION, actualSalt, address(this));
    }
}
