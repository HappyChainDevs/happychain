// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {PackedUserOperation} from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {UserOperationLib} from "account-abstraction/contracts/core/UserOperationLib.sol";
import {IEntryPoint} from "account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {SIG_VALIDATION_SUCCESS} from "account-abstraction/contracts/core/Helpers.sol";

import {BasePaymaster} from "./BasePaymaster.sol";

/**
 * @notice A simple paymaster contract that approves all incoming user operations while managing
 * user-specific gas budgets. Each user has a maximum gas budget of 50,000,000 gas units, which
 * gradually refills over a 24-hour period. For every transaction, the required gas amount is
 * deducted from the user's budget, and the operation is approved if sufficient balance is available.
 *
 * If the user's budget is insufficient to cover the gas cost, or if the bundler isn't authorized,
 * the transaction reverts. This is in accordance with the EIP spec.
 */
contract HappyPaymaster is BasePaymaster {
    using UserOperationLib for PackedUserOperation;

    error InsufficientGasBudget();

    uint256 public constant MAX_GAS_BUDGET = 50_000_000;
    uint256 public constant REFILL_PERIOD = 24 * 60 * 60;
    uint256 public constant REFILL_RATE = MAX_GAS_BUDGET / REFILL_PERIOD;

    struct UserInfo {
        uint64 lastUpdated;
        uint32 userGasBudget;
    }

    mapping(address => UserInfo) public userInfo;

    constructor() {
        _disableInitializers();
    }

    function initialize(address _entryPoint, address _owner) external initializer {
        initBasePaymaster(IEntryPoint(_entryPoint), _owner);
    }

    function _validatePaymasterUserOp(
        PackedUserOperation calldata userOp,
        bytes32, /*userOpHash*/
        uint256 /*requiredPreFund*/
    ) internal override returns (bytes memory context, uint256 validationData) {
        address user = userOp.getSender();
        uint256 requestedGas = _requiredGas(userOp);
        UserInfo memory info = userInfo[user];
        uint32 updatedGasBudget = _updateUserGasBudget(info);

        if (updatedGasBudget < requestedGas) {
            revert InsufficientGasBudget();
        } else {
            info.userGasBudget = updatedGasBudget - uint32(requestedGas);
            info.lastUpdated = uint64(block.timestamp);
            userInfo[user] = info;
        }

        return ("", SIG_VALIDATION_SUCCESS);
    }

    /**
     * @dev Updates the user's gas budget based on the time elapsed since the last update.
     * @return The updated gas budget for the user.
     */
    function _updateUserGasBudget(UserInfo memory info) internal view returns (uint32) {
        uint64 currentTime = uint64(block.timestamp);

        if (info.lastUpdated == 0) {
            return uint32(MAX_GAS_BUDGET);
        } else {
            uint256 timeElapsed = currentTime - info.lastUpdated;
            if (timeElapsed > 24 hours) {
                return uint32(MAX_GAS_BUDGET);
            }
            uint256 gasToRefill = timeElapsed * REFILL_RATE;
            uint256 newGasBudget = info.userGasBudget + gasToRefill;

            return uint32(newGasBudget);
        }
    }

    function _requiredGas(PackedUserOperation calldata userOp) internal pure returns (uint256) {
        // forgefmt: disable-next-item
        return userOp.preVerificationGas
            + userOp.unpackVerificationGasLimit()
            + userOp.unpackCallGasLimit()
            + userOp.unpackPaymasterVerificationGasLimit()
            + userOp.unpackPostOpGasLimit();
    }
}
