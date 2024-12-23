// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.20;

import {HappyFactory} from "./HappyFactory.sol";
import {Ownable} from "solady/auth/Ownable.sol";

/**
 * @title HappyDeployer
 * @notice Controls deployment of HappyAccounts through approved factories
 * @dev Ensures accounts are only deployed through verified factory contracts
 */
contract HappyDeployer is Ownable {
    /// @notice Mapping of factory addresses to their approval status
    mapping(HappyFactory => bool) public approvedFactories;

    error NotApprovedFactory();

    event FactoryApproved(HappyFactory indexed factory, bool approved);
    event AccountDeployed(address indexed account, HappyFactory indexed factory);

    constructor(address _owner) {
        _initializeOwner(_owner);
    }

    /**
     * @notice Deploy an account using an approved factory
     * @param factory The factory contract to use for deployment
     * @param createData The initialization data for the account
     * @param salt The salt for deterministic address generation
     * @return The address of the deployed account
     */
    function deployWithFactory(HappyFactory factory, bytes calldata createData, bytes32 salt)
        external
        payable
        returns (address)
    {
        if (!approvedFactories[factory]) {
            revert NotApprovedFactory();
        }
        address account = factory.createAccount(createData, salt);
        emit AccountDeployed(account, factory);
        return account;
    }

    /**
     * @notice Approve or revoke a factory contract
     * @param factory The factory contract address
     * @param approval The approval status to set
     */
    function setFactoryApproval(HappyFactory factory, bool approval) external onlyOwner {
        approvedFactories[factory] = approval;
        emit FactoryApproved(factory, approval);
    }
}
