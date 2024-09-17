// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {IEntryPoint} from "account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {BasePaymaster} from "account-abstraction/contracts/core/BasePaymaster.sol";
import {PackedUserOperation} from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {UserOperationLib} from "account-abstraction/contracts/core/UserOperationLib.sol";
import {SIG_VALIDATION_SUCCESS, SIG_VALIDATION_FAILED} from "account-abstraction/contracts/core/Helpers.sol";

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

    error InsufficientGasBudget();

    uint256 public constant MAX_GAS_BUDGET = 1_000_000;
    uint256 public constant REFILL_PERIOD = 24 * 60 * 60;
    uint256 public constant REFILL_RATE = MAX_GAS_BUDGET / REFILL_PERIOD;

    uint256 public constant MAX_ALLOWED_FEE_PER_GAS = 100 gwei; //@norswap, this is just placeholder for now

    struct UserInfo {
        uint64 lastUpdated;
        uint32 userGasBudget;
    }

    mapping(address => UserInfo) public userInfo;
    mapping(address => bool) public allowedBundlers;

    constructor(IEntryPoint _entryPoint, address[] memory initialAllowedBundlers) BasePaymaster(_entryPoint) {
        for (uint256 i = 0; i < initialAllowedBundlers.length; i++) {
            allowedBundlers[initialAllowedBundlers[i]] = true;
        }
    }

    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32, /*userOpHash*/
        uint256 /*requiredPreFund*/
    ) internal override returns (bytes memory context, uint256 validationData) {
        // solhint-disable-next-line avoid-tx-origin
        if (!allowedBundlers[tx.origin]) {
            return ("", SIG_VALIDATION_FAILED);
        }

        address user = userOp.getSender();
        uint256 currentGas = _requiredGas(userOp);

        UserInfo memory info = userInfo[user];

        uint32 updatedGasBudget = _updateUserGasBudget(info);

        // For PR review(temp): Since we check for userbudget every time, we don't really need to update the user's gas
        // budget or even the lastUpdatedTime, since it'll all be recalculated on the next txn by the user in some time
        // And since the mathemetical operations remain the same (except for the values, like 60min instead of 30min)
        // So, gas used remains same?
        // So we only update the userInfo struct when we actually go through with this txn and update userBudget
        if (updatedGasBudget < currentGas) {
            revert InsufficientGasBudget();
        }

        info.userGasBudget = updatedGasBudget - uint32(currentGas);
        info.lastUpdated = uint64(block.timestamp);

        userInfo[user] = info;

        return ("", SIG_VALIDATION_SUCCESS);
    }

    /**
     * @dev Updates the user's gas budget based on the time elapsed since the last update.
     * This function refills the user's gas budget gradually up to the maximum gas budget.
     * @param info The user information structure containing the user's gas budget and last updated time.
     * @return The updated gas budget for the user.
     */
    function _updateUserGasBudget(UserInfo memory info) internal view returns (uint32) {
        uint64 currentTime = uint64(block.timestamp);

        if (info.lastUpdated == 0) {
            return uint32(MAX_GAS_BUDGET);
        } else {
            uint256 timeElapsed = currentTime - info.lastUpdated;
            uint256 gasToRefill = timeElapsed * REFILL_RATE;

            uint256 newGasBudget = info.userGasBudget + gasToRefill;
            return uint32(newGasBudget > MAX_GAS_BUDGET ? MAX_GAS_BUDGET : newGasBudget);
        }
    }

    /**
     * @dev Calculates the total gas required for a user operation by summing up the various gas limits
     * involved in the operation, including verification gas, call gas, pre-verification gas, and any
     * additional gas limits related to paymaster verification and post-operation handling.
     * @param userOp The packed user operation containing all relevant data for gas calculation.
     * @return totalGasRequired The total amount of gas required for the user operation.
     */
    function _requiredGas(PackedUserOperation calldata userOp) internal pure returns (uint256) {
        // forgefmt: disable-next-item
        uint256 requiredGas = userOp.preVerificationGas
            + userOp.unpackVerificationGasLimit()
            + userOp.unpackCallGasLimit()
            + userOp.unpackPaymasterVerificationGasLimit()
            + userOp.unpackPostOpGasLimit();

        return requiredGas;
    }
}
