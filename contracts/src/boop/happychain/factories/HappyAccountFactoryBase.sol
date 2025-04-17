// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;
import {HappyAccountRegistry} from "../HappyAccountRegistry.sol";

/**
 * Base factory contract for deploying deterministic ERC1967 proxies for {HappyAccount}.
 */

abstract contract HappyAccountFactoryBase {
    HappyAccountRegistry public immutable happyAccountRegistry;
    
    // ====================================================================================================
    // ERRORS

    /// Error thrown when account initialization fails
    error InitializeError();

    /// Error thrown when attempting to deploy to an address that already has code
    error AlreadyDeployed();

    constructor(address happyAccountRegistryAddress) {
        happyAccountRegistry = HappyAccountRegistry(happyAccountRegistryAddress);
    }

    // ====================================================================================================
    // EXTERNAL FUNCTIONS

    /**
     * Creates and deploys a new HappyAccount proxy contract
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
        assembly ("memory-safe") {
            proxy := create2(0, add(contractCode, 0x20), mload(contractCode), combinedSalt)
        }
        if (proxy == address(0)) revert InitializeError();

        happyAccountRegistry.addRegisteredAccount(proxy);

        return proxy;
    }

    /**
     * Predicts the address where a HappyAccount would be deployed
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

    /// @dev Predicts the address where a HappyAccount would be deployed, given the combined salt, and contract code.
    function _getAddress(bytes32 salt, bytes memory contractCode) internal view returns (address) {
        return address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(contractCode)))))
        );
    }

    /// @dev Prepares the contract creation code for a proxy contract.
    function _prepareContractCode(address owner) internal view virtual returns (bytes memory);
}
