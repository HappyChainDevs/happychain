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

    error ExcessiveMaxFeePerGas(uint256 maxFeePerGas, uint256 allowedMaxFeePerGas);

    uint256 public constant MAX_GAS_BUDGET = 1_000_000;
    uint256 public constant REFILL_PERIOD = 24 * 60 * 60;
    uint256 public constant REFILL_RATE = MAX_GAS_BUDGET / REFILL_PERIOD;

    uint256 public constant MAX_ALLOWED_FEE_PER_GAS = 100 gwei; //@norswap, this is just placeholder for now

    struct UserInfo {
        uint64 lastUpdated;
        uint32 userGasBudget;
    }

    mapping(address => UserInfo) public userInfo;

    constructor(IEntryPoint _entryPoint) BasePaymaster(_entryPoint) {}

    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32, /*userOpHash*/
        uint256 /*requiredPreFund*/
    ) internal override returns (bytes memory context, uint256 validationData) {
        address user = userOp.getSender();
        uint256 currentGas = _requiredGas(userOp);

        _updateUserGasBudget(user);

        if (userInfo[user].userGasBudget < currentGas) {
            return ("", SIG_VALIDATION_FAILED);
        }

        userInfo[user].userGasBudget -= uint32(currentGas);

        return ("", SIG_VALIDATION_SUCCESS);
    }

    /**
     * @dev Updates the user's gas budget based on the time elapsed since the last update.
     * This function refills the user's gas budget gradually up to the maximum gas budget.
     * @param user The address of the user whose gas budget is being updated.
     */
    function _updateUserGasBudget(address user) internal {
        UserInfo memory info = userInfo[user];
        uint64 currentTime = uint64(block.timestamp);

        if (info.lastUpdated == 0) {
            info.userGasBudget = uint32(MAX_GAS_BUDGET);
            info.lastUpdated = currentTime;
        } else {
            uint256 timeElapsed = currentTime - info.lastUpdated;
            uint256 gasToRefill = timeElapsed * REFILL_RATE;

            uint256 newGasBudget = info.userGasBudget + gasToRefill;
            info.userGasBudget = uint32(newGasBudget > MAX_GAS_BUDGET ? MAX_GAS_BUDGET : newGasBudget);
            info.lastUpdated = currentTime;
        }

        userInfo[user] = info;
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
