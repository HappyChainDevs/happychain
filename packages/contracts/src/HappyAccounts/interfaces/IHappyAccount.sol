// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {INonceManager} from "./INonceManager.sol";

/**
 * @title  IHappyAccount
 * @dev    Interface for Happy Accounts - our simplified smart account implementation
 *         optimized for low-latency use cases.
 *
 * ==================
 * Transaction Flow:
 * ==================
 *
 *     Submitter calls
 *   ┌─────────────────┐
 *   │ execute(happyTx)│
 *   └────────┬────────┘
 *            │
 *            ▼
 *   ┌─────────────────┐
 *   │ validateHappyTx │ Internal validation (nonce, etc.)
 *   └────────┬────────┘
 *            │
 *            ▼
 *   ┌─────────────────┐
 *   │  [If validator  │ External validation
 *   │  != address(0)] │ via IHappyValidator
 *   └────────┬────────┘
 *            │
 *            ▼
 *    Execute if valid
 *
 */

/**
 * @dev When sending a happyTx to the wrong account.
 */
error WrongAccount();

/**
 * @dev When the account validation of the happyTx fails.
 * @param reason The custom error selector returned by the validation function
 */
error AccountValidationFailed(bytes4 reason);

/**
 * @dev When the account validation reverts (in violation of the spec).
 * @param revertData The revert data for off-chain parsing
 */
error AccountValidationReverted(bytes revertData);

/**
 * @dev When the account does not have enough funds to pay for the happyTx.
 */
error AccountBalanceInsufficient();

/**
 * @dev When the paymaster does not have enough funds to pay for the happyTx.
 */
error PaymasterBalanceInsufficient();

/**
 * @dev When the paymaster validation of the happyTx fails.
 * @param reason The custom error selector returned by the validation function
 */
error PaymasterValidationFailed(bytes4 reason);

/**
 * @dev When the paymaster validation reverts (in violation of the spec).
 * @param revertData The revert data for off-chain parsing
 */
error PaymasterValidationReverted(bytes revertData);

/**
 * @dev When payment for the happyTx from the account fails.
 */
error AccountPaymentFailed();

/**
 * @dev When payment for the happyTx from the paymaster fails.
 */
error PaymasterPaymentFailed();

/**
 * @dev When the validator address provided is zero.
 */
error InvalidValidator();

/**
 * @dev When the validator is neither the root validator nor in the approved list.
 */
error ValidatorNotApproved();

/**
 * @dev When payment for the happyTx from the account is short.
 * @param amountShort The amount by which the payment was short
 */
event AccountPaymentCameShort(uint256 amountShort);

/**
 * @dev When payment for the happyTx from the paymaster is short.
 * @param amountShort The amount by which the payment was short
 */
event PaymasterPaymentCameShort(uint256 amountShort);

/**
 * @dev Emitted when the implementation of the proxy is upgraded.
 * @param implementation Address of the new implementation
 */
event Upgraded(address indexed implementation);

/**
 * @dev Emitted when the account receives ETH.
 * @param sender Address that sent ETH
 * @param amount Amount of ETH received
 */
event Received(address sender, uint256 amount);

/**
 * @dev Emitted when the root validator is changed.
 * @param validator Address of the new root validator
 */
event RootValidatorChanged(address indexed validator);

/**
 * @dev Emitted when a validator is added to the approved list.
 * @param validator Address of the added validator
 */
event ValidatorAdded(address indexed validator);

/**
 * @dev Emitted when a validator is removed from the approved list.
 * @param validator Address of the removed validator
 */
event ValidatorRemoved(address indexed validator);

/**
 * @dev When a call reverts during execution.
 * @param revertData The revert data from the failed call
 */
event CallReverted(bytes revertData);

interface IHappyAccount is INonceManager {
    /**
     * @dev Validate a Happy Transaction.
     *
     * This function validates the happyTx before execution. It must:
     * 1. Perform basic validation (nonce, signature if internal validation)
     * 2. If external validator is specified (validator != address(0)),
     *    delegate to IHappyValidator.validate()
     *
     * Must return 0 for success, or appropriate error selector for failure.
     * For simulation calls (tx.origin == address(0)), validation failures
     * should return error selector but not revert.
     *
     * @param encodedHappyTx The encoded happy transaction data
     * @return validationResult 0 for success, error selector for failure
     */
    function validateHappyTx(bytes calldata encodedHappyTx) external returns (bytes4);

    /**
     * @dev Execute a Happy Transaction.
     *
     * This function immediately revert or emits the errors and events defined
     * in this file whenever the associated condition is hit.
     *
     * This function must, in this order:
     * 1. Validate the happyTx with the specified validator.
     *    The validator must implement IHappyValidator interface for compliant behavior.
     *
     * 2. Validate the balance of either the paymaster (if paymaster != address(0)) or
     *    the account itself against the gas limit and baseFee.
     *
     * 3. Execute the call specified in the happyTx.
     *    The account may customize the call or perform additional pre/post operations.
     *
     * Gas Estimation:
     * - Must ignore failed (but not reverted) validations if tx.origin == address(0)
     * - Gas estimation possible via eth_call with zero address as sender
     *
     * Gas Reporting:
     * - Returns actual gas consumed (excluding call cost)
     * - Calculated as difference between gasLeft() at start/end
     * - Adds ~100 gas to account for unavoidable discrepancy
     *
     * @param encodedHappyTx The encoded happy transaction data
     * @return gasUsed The amount of gas consumed by the execution
     */
    function execute(bytes calldata encodedHappyTx) external payable returns (uint256 gasUsed);

    /**
     * @dev Returns the address of the factory that deployed this account.
     * @return The factory address
     */
    function factory() external view returns (address);

    /**
     * @dev Returns the address of the owner of the Happy Account.
     * @return The owner address
     */
    function owner() external view returns (address);
}
