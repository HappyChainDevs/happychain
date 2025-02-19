// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ScrappyAccount} from "../samples/ScrappyAccount.sol";

/// @notice Sample factory contract for deploying deterministic ERC1967 proxies for {ScrappyAccount}.
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
    function createAccount(bytes32 salt, address owner) external payable returns (address) {
        address predictedAddress = _getAddress(salt, owner);
        if (predictedAddress.code.length > 0) revert AlreadyDeployed();

        // Combine salt with owner for better security against frontrunning
        bytes32 combinedSalt = keccak256(abi.encodePacked(salt, owner));

        // Prepare contract code
        bytes memory initData = abi.encodeCall(ScrappyAccount.initialize, (owner));
        bytes memory constructorArgs = abi.encode(ACCOUNT_IMPLEMENTATION, initData);
        bytes memory creationCode = type(ERC1967Proxy).creationCode;
        bytes memory contractCode = abi.encodePacked(creationCode, constructorArgs);

        address payable proxy = _deployDeterministic(contractCode, combinedSalt);
        if (proxy == address(0)) revert InitializeError();

        return proxy;
    }

    /**
     * @dev   Predicts the address where a HappyAccount would be deployed
     * @param salt used for deterministic deployment
     * @param owner address of the owner of the account
     */
    function getAddress(bytes32 salt, address owner) external view returns (address) {
        return _getAddress(salt, owner);
    }

    /// @dev   Predicts the address where a HappyAccount would be deployed, given the combined salt.
    function _getAddress(bytes32 salt, address owner) internal view returns (address) {
        bytes32 combinedSalt = keccak256(abi.encodePacked(salt, owner));

        bytes memory creationCode = type(ERC1967Proxy).creationCode;
        bytes memory initData = abi.encodeCall(ScrappyAccount.initialize, (owner));
        bytes memory constructorArgs = abi.encode(ACCOUNT_IMPLEMENTATION, initData);
        bytes memory contractCode = abi.encodePacked(creationCode, constructorArgs);

        return address(
            uint160(
                uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), combinedSalt, keccak256(contractCode))))
            )
        );
    }

    /// @dev   Deploys a contract deterministically given its creation code and salt.
    function _deployDeterministic(bytes memory creationCode, bytes32 salt) internal returns (address payable addr) {
        assembly {
            addr := create2(0, add(creationCode, 0x20), mload(creationCode), salt)
        }
    }
}
