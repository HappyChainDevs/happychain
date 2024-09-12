// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {IEntryPoint} from "account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {BasePaymaster} from "account-abstraction/contracts/core/BasePaymaster.sol";
import {PackedUserOperation} from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {UserOperationLib} from "account-abstraction/contracts/core/UserOperationLib.sol";
import {SIG_VALIDATION_SUCCESS, SIG_VALIDATION_FAILED, min} from "account-abstraction/contracts/core/Helpers.sol";

/**
 * @notice A simple paymaster contract that approves all incoming user operations while managing
 * user-specific gas budgets. Each user has a maximum gas budget of 1,000,000 gas units, which
 * gradually refills over a 24-hour period. For every transaction, the required gas amount is
 * deducted from the user's budget, and the operation is approved if sufficient balance is available.
 *
 * If the user's budget is insufficient to cover the gas cost, the transaction is rejected, returning
 * a validation failure code (1).
 */
contract HappyPaymaster is BasePaymaster {
    using UserOperationLib for PackedUserOperation;

    uint256 public constant MAX_GAS_BUDGET = 1_000_000;
    uint256 public constant REFILL_PERIOD = 24 * 60 * 60;
    uint256 public constant REFILL_RATE = MAX_GAS_BUDGET / REFILL_PERIOD;

    mapping(address => uint256) public userGasBudget;
    mapping(address => uint256) public lastUpdated;

    constructor(IEntryPoint _entryPoint) BasePaymaster(_entryPoint) {}

    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32, /*userOpHash*/
        uint256 /*requiredPreFund*/
    ) internal override returns (bytes memory context, uint256 validationData) {
        address user = userOp.getSender();
        uint256 currentGas = userOp.requiredGas();

        _updateUserGasBudget(user);

        if (userGasBudget[user] < currentGas) {
            return ("", SIG_VALIDATION_FAILED);
        }

        userGasBudget[user] -= currentGas;

        return ("", SIG_VALIDATION_SUCCESS);
    }

    /**
     * @dev Updates the user's gas budget based on the time elapsed since the last update.
     * This function refills the user's gas budget gradually up to the maximum gas budget.
     * @param user The address of the user whose gas budget is being updated.
     */
    function _updateUserGasBudget(address user) internal {
        uint256 lastUpdatedTime = lastUpdated[user];
        uint256 currentTime = block.timestamp;

        if (lastUpdatedTime == 0) {
            userGasBudget[user] = MAX_GAS_BUDGET;
            lastUpdated[user] = currentTime;
            return;
        }

        uint256 timeElapsed = currentTime - lastUpdatedTime;
        uint256 gasToRefill = timeElapsed * REFILL_RATE;

        userGasBudget[user] = min(userGasBudget[user] + gasToRefill, MAX_GAS_BUDGET);
        lastUpdated[user] = currentTime;
    }
}
