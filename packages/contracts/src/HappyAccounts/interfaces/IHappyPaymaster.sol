// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../HappyTx.sol";

/**
 * @title  IHappyPaymaster
 * @dev    Interface for paymasters that can sponsor gas fees for HappyTx transactions.
 *         Each user has a gas budget that refills over time, with a maximum cap.
 */
interface IHappyPaymaster {
    /**
     * @dev Error when user has insufficient budget for the transaction
     * @param user The user address
     * @param available The user's available budget
     * @param required The required budget
     */
    error InsufficientUserBudget(address user, uint256 available, uint256 required);

    /**
     * @dev Error when paymaster validation fails with custom reason
     * @param reason The reason for validation failure
     */
    error ValidationFailed(bytes reason);

    /**
     * @dev Error when validation data format is invalid
     */
    error InvalidPaymasterData();

    /**
     * @dev Emitted when a user's budget is updated
     * @param user The user address
     * @param oldBudget Previous budget amount
     * @param newBudget New budget amount
     * @param timestamp Time of the update
     */
    event UserBudgetUpdated(address indexed user, uint256 oldBudget, uint256 newBudget, uint256 timestamp);

    /**
     * @dev Emitted when gas is paid out for a transaction
     * @param user The user address
     * @param amount Amount of gas paid
     */
    event GasPaidOut(address indexed user, uint256 amount);

    /**
     * @dev Validates whether the paymaster will sponsor this specific transaction
     * @param happyTx The transaction to validate
     * @return validationResult A bytes4 selector: 0 for success, error selector for failure
     * @notice Validates user's budget and permissions for this specific transaction
     */
    function validatePaymaster(HappyTx calldata happyTx) external returns (bytes4 validationResult);

    /**
     * @dev Pays out the gas costs for the transaction
     * @param happyTx The transaction that was executed
     * @param actualCost The actual gas cost to reimburse
     * @return success Whether the payout was successful
     * @notice This function should:
     * 1. Verify the user has sufficient budget
     * 2. Deduct from user's budget
     * 3. Handle payment to tx.origin
     */
    function payout(HappyTx calldata happyTx, uint256 actualCost) external returns (bool success);

    /**
     * @dev Returns the current gas budget for a user
     * @param user The user address to check budget for
     * @return budget The user's current gas budget
     * @return maxBudget The maximum possible budget
     * @return lastUpdated The last time the budget was updated
     */
    function getUserBudget(address user)
        external
        view
        returns (uint256 budget, uint256 maxBudget, uint256 lastUpdated);
}
