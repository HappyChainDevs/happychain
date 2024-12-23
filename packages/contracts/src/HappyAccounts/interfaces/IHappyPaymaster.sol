// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../HappyTx.sol";

/**
 * @title  IHappyPaymaster
 * @dev    Interface for paymasters that can sponsor gas fees for HappyTx transactions
 *         Paymasters can implement custom validation and payment logic
 */
interface IHappyPaymaster {
    /**
     * @dev Error when paymaster has insufficient balance
     */
    error InsufficientBalance();

    /**
     * @dev Error when paymaster validation fails
     */
    error ValidationFailed();

    /**
     * @dev Error when validation data is invalid
     */
    error InvalidPaymasterData();

    /**
     * @dev Validates whether the paymaster will sponsor the happyTx
     * @param happyTx The transaction to validate
     * @return validationResult A bytes4 selector: 0 for success, error selector for failure
     */
    function validatePaymaster(HappyTx calldata happyTx) external returns (bytes4 validationResult);

    /**
     * @dev Pays out the gas costs for the transaction
     * @param happyTx The transaction that was executed
     * @param actualCost The actual gas cost to reimburse
     * @return success Whether the payout was successful
     * @notice This function should handle payment to tx.origin
     */
    function payout(HappyTx calldata happyTx, uint256 actualCost) external returns (bool success);

    /**
     * @dev Returns the balance available for gas sponsorship
     * @return The balance available
     */
    function balance() external view returns (uint256);
}
