// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {IHappyPaymaster} from "../interfaces/IHappyPaymaster.sol";
import {HappyTx} from "./HappyTx.sol";

/**
 * @title HappyPaymaster
 * @notice A paymaster contract that manages user gas budgets with automatic refills.
 * Each user has a maximum gas budget that refills over a 24-hour period.
 * Only authorized bundlers can request gas payouts.
 */
contract HappyPaymaster is IHappyPaymaster {
    /// @dev Maximum gas budget per user (50M gas)
    uint256 public constant MAX_GAS_BUDGET = 50_000_000;

    /// @dev Refill period in seconds (24 hours)
    uint256 public constant REFILL_PERIOD = 24 hours;

    /// @dev Gas refill rate per second
    uint256 public constant REFILL_RATE = MAX_GAS_BUDGET / REFILL_PERIOD;

    /// @dev Owner of the paymaster contract
    address public immutable OWNER;

    /// @dev User gas budget information
    struct UserInfo {
        uint64 lastUpdated;
        uint192 gasBudget;
    }

    /// @dev Mapping of user address to their gas budget info
    mapping(address => UserInfo) public userInfo;

    /// @dev Mapping of authorized bundlers
    mapping(address => bool) public allowedBundlers;

    error NotAuthorized();
    error PaymentFailed();
    error InvalidBundler();
    error InsufficientPaymasterBalance();

    event BundlerStatusUpdated(address indexed bundler, bool allowed);

    modifier onlyOwner() {
        if (msg.sender != OWNER) revert NotAuthorized();
        _;
    }

    constructor(address[] memory initialBundlers) {
        OWNER = msg.sender;
        for (uint256 i = 0; i < initialBundlers.length; i++) {
            if (initialBundlers[i] != address(0)) {
                allowedBundlers[initialBundlers[i]] = true;
                emit BundlerStatusUpdated(initialBundlers[i], true);
            }
        }
    }

    /**
     * @dev Add a new authorized bundler
     * @param bundler The bundler address to authorize
     */
    function addBundler(address bundler) external onlyOwner {
        if (bundler == address(0)) revert NotAuthorized();
        allowedBundlers[bundler] = true;
        emit BundlerStatusUpdated(bundler, true);
    }

    /**
     * @dev Remove an authorized bundler
     * @param bundler The bundler address to remove
     */
    function removeBundler(address bundler) external onlyOwner {
        allowedBundlers[bundler] = false;
        emit BundlerStatusUpdated(bundler, false);
    }

    /**
     * @dev Updates and returns a user's current gas budget based on time elapsed
     * @param user The user address
     * @return The updated gas budget
     */
    function _updateUserGasBudget(address user) internal returns (uint256) {
        UserInfo storage info = userInfo[user];
        uint64 currentTime = uint64(block.timestamp);
        uint256 oldBudget = info.gasBudget;

        // First time user gets max budget
        if (info.lastUpdated == 0) {
            info.gasBudget = uint192(MAX_GAS_BUDGET);
            info.lastUpdated = currentTime;
            emit UserBudgetUpdated(user, 0, MAX_GAS_BUDGET, currentTime);
            return MAX_GAS_BUDGET;
        }

        // Calculate refill amount based on time elapsed
        uint256 timeElapsed = currentTime - info.lastUpdated;
        uint256 gasToRefill = timeElapsed * REFILL_RATE;
        uint256 newBudget = info.gasBudget + gasToRefill;

        // Cap at max budget
        if (newBudget > MAX_GAS_BUDGET) {
            newBudget = MAX_GAS_BUDGET;
        }

        info.gasBudget = uint192(newBudget);
        info.lastUpdated = currentTime;

        if (newBudget != oldBudget) {
            emit UserBudgetUpdated(user, oldBudget, newBudget, currentTime);
        }

        return newBudget;
    }

    /**
     * @dev Calculates total gas required for the transaction
     */
    function _calculateRequiredGas(HappyTx calldata happyTx) internal pure returns (uint256) {
        return happyTx.gasLimit;
    }

    /**
     * @inheritdoc IHappyPaymaster
     */
    function validatePaymaster(HappyTx calldata happyTx) external returns (bytes4) {
        address user = happyTx.account;
        uint256 requiredGas = _calculateRequiredGas(happyTx);
        uint256 currentBudget = _updateUserGasBudget(user);

        if (currentBudget < requiredGas) {
            revert InsufficientUserBudget(user, currentBudget, requiredGas);
        }

        return bytes4(0);
    }

    /**
     * @inheritdoc IHappyPaymaster
     */
    function payout(HappyTx calldata happyTx, uint256 actualCost) external returns (bool) {
        // solhint-disable-next-line avoid-tx-origin
        if (!allowedBundlers[tx.origin]) revert InvalidBundler();

        address user = happyTx.account;
        UserInfo storage info = userInfo[user];

        // Ensure budget is up to date and sufficient
        uint256 currentBudget = _updateUserGasBudget(user);
        if (currentBudget < actualCost) {
            revert InsufficientUserBudget(user, currentBudget, actualCost);
        }

        // Check if paymaster has enough balance
        if (address(this).balance < actualCost) {
            revert InsufficientPaymasterBalance();
        }

        // Deduct gas used from budget
        info.gasBudget = uint192(currentBudget - actualCost);
        emit UserBudgetUpdated(user, currentBudget, info.gasBudget, block.timestamp);
        emit GasPaidOut(user, actualCost);

        // Pay the gas cost to tx.origin
        // solhint-disable-next-line avoid-tx-origin
        (bool success,) = payable(tx.origin).call{value: actualCost}("");
        if (!success) revert PaymentFailed();

        return true;
    }

    /**
     * @inheritdoc IHappyPaymaster
     */
    function getUserBudget(address user)
        external
        view
        returns (uint256 budget, uint256 maxBudget, uint256 lastUpdated)
    {
        UserInfo memory info = userInfo[user];

        // Calculate current budget including refill
        uint256 timeElapsed = block.timestamp - info.lastUpdated;
        uint256 gasToRefill = timeElapsed * REFILL_RATE;
        uint256 currentBudget = info.gasBudget + gasToRefill;

        if (currentBudget > MAX_GAS_BUDGET) {
            currentBudget = MAX_GAS_BUDGET;
        }

        return (currentBudget, MAX_GAS_BUDGET, info.lastUpdated);
    }

    receive() external payable {}
}
