// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Encoding} from "boop/core/Encoding.sol";
import {EntryPoint} from "boop/core/EntryPoint.sol";
import {Utils} from "boop/core/Utils.sol";
import {Received, NotFromEntryPoint} from "boop/interfaces/EventsAndErrors.sol";
import {IPaymaster, SubmitterFeeTooHigh} from "boop/interfaces/IPaymaster.sol";
import {Boop} from "boop/interfaces/Types.sol";
import {Ownable} from "openzeppelin/access/Ownable.sol";
import {ReentrancyGuardTransient} from "openzeppelin/utils/ReentrancyGuardTransient.sol";

/**
 * Information about a user's gas budget.
 */
struct UserInfo {
    uint64 lastUpdated;
    uint32 userGasBudget;
}

/**
 * Implementation of a paymaster contract implementing the IPaymaster interface.
 * This paymaster sponsors any call, as long as its submitter fee is not too high
 * (computed on the basis of a max gas cost per byte of calldata, configurable at deploy time).
 *
 * User Budgets: This paymaster contract approves all incoming user operations while managing
 * user-specific gas budgets. Each user has a maximum gas budget of 50,000,000 gas units, which
 * gradually refills over a 24-hour period. For every transaction, the required gas amount is
 * deducted from the user's budget, and the operation is approved if sufficient balance is available.
 *
 * If the user's budget is insufficient to cover the gas cost, or if the bundler isn't authorized,
 * the transaction reverts. This is in accordance with the EIP spec.
 */
contract HappyPaymaster is IPaymaster, ReentrancyGuardTransient, Ownable {
    using Encoding for Boop;

    // ====================================================================================================
    // ERRORS

    error InsufficientGasBudget();

    // ====================================================================================================
    // USER ALLOWANCE CONSTANTS

    /// @dev Maximum gas budget for a user
    uint256 public constant MAX_GAS_BUDGET = 1_000_000_000;

    /// @dev Refill period for a user's gas budget
    uint256 public constant REFILL_PERIOD = 24 * 60 * 60;

    /// @dev Refill rate for a user's gas budget
    uint256 public constant REFILL_RATE = MAX_GAS_BUDGET / REFILL_PERIOD;

    // ====================================================================================================
    // STATE AND IMMUTABLES

    /// The allowed EntryPoint contract
    address public immutable ENTRYPOINT;

    /// This paymaster refuses to pay more to the submitter than this amount of wei per byte of data.
    uint256 public immutable SUBMITTER_TIP_PER_BYTE;

    /// @dev Mapping of user addresses to their gas budgets and last updated times.
    mapping(address => UserInfo) private userInfo;

    // ====================================================================================================
    // MODIFIERS

    /// @dev Checks if the the call was made from the EntryPoint contract
    modifier onlyFromEntryPoint() {
        if (msg.sender != ENTRYPOINT) revert NotFromEntryPoint();
        _;
    }

    // ====================================================================================================
    // CONSTRUCTOR

    /**
     * @param submitterTipPerByte The maximum fee per byte that the submitter is willing to pay
     */
    constructor(address entryPoint, uint256 submitterTipPerByte, address owner) Ownable(owner) {
        ENTRYPOINT = entryPoint;
        SUBMITTER_TIP_PER_BYTE = submitterTipPerByte;
    }

    // ====================================================================================================
    // PAYMENT VALIDATION

    /**
     * This function validates that the submitter fee is reasonably priced, but otherwise accepts
     * to pay for any boop.
     */
    function validatePayment(Boop memory boop) external onlyFromEntryPoint returns (bytes memory) {
        if (boop.submitterFee > 0) {
            uint256 txSize = Utils.estimateSubmitterTxSize(boop);
            uint256 maxFeePerByte = boop.maxFeePerGas * 16; // 16 = calldata cost for non-zero byte
            uint256 maxSubmitterFee = txSize * (maxFeePerByte + SUBMITTER_TIP_PER_BYTE);

            if (uint256(boop.submitterFee) > maxSubmitterFee) {
                return abi.encodeWithSelector(SubmitterFeeTooHigh.selector);
            }
        }

        UserInfo memory info = userInfo[boop.account];
        uint32 updatedGasBudget = _updateUserGasBudget(info);
        if (updatedGasBudget < boop.gasLimit) {
            return abi.encodeWithSelector(InsufficientGasBudget.selector);
        }

        info.userGasBudget = updatedGasBudget - boop.gasLimit;
        info.lastUpdated = uint64(block.timestamp);
        userInfo[boop.account] = info;

        return abi.encodeWithSelector(bytes4(0));
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
            uint256 gasToRefill = timeElapsed * REFILL_RATE;
            uint256 newGasBudget = info.userGasBudget + gasToRefill;
            return newGasBudget > MAX_GAS_BUDGET ? uint32(MAX_GAS_BUDGET) : uint32(newGasBudget);
        }
    }

    // ====================================================================================================
    // STAKE MANAGEMENT

    /**
     * Adds the value to the paymaster's stake. cf. {Staking.deposit}
     */
    function deposit() external payable {
        EntryPoint(ENTRYPOINT).deposit{value: msg.value}(address(this));
    }

    /**
     * cf. {Staking.updateWithdrawalDelay}
     */
    function updateWithdrawalDelay(uint64 withdrawDelay) external onlyOwner {
        EntryPoint(ENTRYPOINT).updateWithdrawDelay(withdrawDelay);
    }

    /**
     * Equivalent to {updateWithdrawalDelay} followed by {deposit}.
     */
    function depositWithDelay(uint64 withdrawDelay) external payable onlyOwner {
        EntryPoint(ENTRYPOINT).updateWithdrawDelay(withdrawDelay);
        EntryPoint(ENTRYPOINT).deposit{value: msg.value}(address(this));
    }

    /**
     * cf. {Staking.initiateWithdrawal}
     */
    function initiateWithdrawal(uint128 amount) external onlyOwner {
        EntryPoint(ENTRYPOINT).initiateWithdrawal(amount);
    }

    /**
     * cf. {Staking.withdraw}
     */
    function withdraw(uint128 amount, address payable destination) external onlyOwner {
        EntryPoint(ENTRYPOINT).withdraw(amount, destination);
    }

    // ====================================================================================================
    // SPECIAL FUNCTIONS

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    /// Allows the owner to withdraw a specified amount of funds from the paymaster, reverting if failing to transfer.
    function withdraw(address to, uint256 amount) external onlyOwner {
        if (amount > address(this).balance) revert("Insufficient balance");
        (bool success,) = payable(to).call{value: amount}("");
        require(success, "Failed to withdraw funds");
    }

    /**
     * Returns the current budget (in wei) for a given address.
     */
    function getBudget(address user) external view returns (uint32 budget) {
        UserInfo memory stored = userInfo[user];
        return stored.lastUpdated == 0 ? uint32(MAX_GAS_BUDGET) : stored.userGasBudget;
    }
}
