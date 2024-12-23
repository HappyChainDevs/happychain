// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {LibClone} from "solady/utils/LibClone.sol";

/**
 * @title  HappyAccountFactory
 * @dev    Factory contract for deploying deterministic ERC1967 proxies for HappyAccounts
 */
contract HappyAccountFactory {
    error InitializeError();

    /// @dev The implementation contract that all proxies will delegate to
    address public immutable IMPLEMENTATION;

    /**
     * @dev Emitted when a new HappyAccount is created
     * @param account The address of the created account
     * @param salt The salt used to create the account
     */
    event HappyAccountCreated(address indexed account, bytes32 salt);

    constructor(address _implementation) {
        IMPLEMENTATION = _implementation;
    }

    /**
     * @dev Creates a new HappyAccount proxy
     * @param initData The initialization data for the account
     * @param salt A unique salt for deterministic deployment
     * @return The address of the created account
     */
    function createAccount(bytes calldata initData, bytes32 salt) public payable returns (address) {
        bytes32 actualSalt = keccak256(abi.encodePacked(initData, salt));

        (bool alreadyDeployed, address account) =
            LibClone.createDeterministicERC1967(msg.value, IMPLEMENTATION, actualSalt);

        if (!alreadyDeployed) {
            // solhint-disable-next-line avoid-low-level-calls
            (bool success,) = account.call(initData);
            if (!success) {
                revert InitializeError();
            }
        }

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
        return LibClone.predictDeterministicAddressERC1967(IMPLEMENTATION, actualSalt, address(this));
    }
}
