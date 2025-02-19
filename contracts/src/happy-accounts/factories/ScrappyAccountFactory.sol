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
     * @notice   Creates and deploys a new HappyAccount proxy contract
     * @param salt A unique salt for deterministic deployment
     * @param owner The address of the owner of the account
     */
    function createAccount(bytes32 salt, address owner) external payable returns (address) {
        // Combine salt with owner for better security against frontrunning
        bytes32 combinedSalt = keccak256(abi.encodePacked(salt, owner));

        // Prepare contract creation code to avoid re-computation in _getAddress
        bytes memory contractCode = _prepareContractCode(owner);

        address predictedAddress = _getAddress(combinedSalt, contractCode);
        if (predictedAddress.code.length > 0) revert AlreadyDeployed();

        address payable proxy;
        assembly {
            proxy := create2(0, add(contractCode, 0x20), mload(contractCode), combinedSalt)
        }
        if (proxy == address(0)) revert InitializeError();

        return proxy;
    }

    /**
     * @notice   Predicts the address where a HappyAccount would be deployed
     * @param salt A unique salt for deterministic deployment
     * @param owner The address of the owner of the account
     */
    function getAddress(bytes32 salt, address owner) external view returns (address) {
        bytes32 combinedSalt = keccak256(abi.encodePacked(salt, owner));
        bytes memory contractCode = _prepareContractCode(owner);
        return _getAddress(combinedSalt, contractCode);
    }

    // ====================================================================================================
    // INTERNAL FUNCTIONS

    /// @dev   Predicts the address where a HappyAccount would be deployed, given the combined salt, and contract code.
    function _getAddress(bytes32 salt, bytes memory contractCode) internal view returns (address) {
        return address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(contractCode)))))
        );
    }

    /// @dev Prepares the contract creation code for ERC1967Proxy contract.
    function _prepareContractCode(address owner) internal view returns (bytes memory) {
        bytes memory creationCode = type(ERC1967Proxy).creationCode;
        bytes memory initData = abi.encodeCall(ScrappyAccount.initialize, (owner));
        bytes memory constructorArgs = abi.encode(ACCOUNT_IMPLEMENTATION, initData);
        return abi.encodePacked(creationCode, constructorArgs);
    }
}
