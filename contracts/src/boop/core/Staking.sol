// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

struct Stake {
    /**
     * Staked balance, inclusive of the unlocked balance.
     */
    uint128 balance;
    /**
     * Balance available for withdrawal after the withdraw delay, starting from {withdrawtimestamp}.
     */
    uint128 unlockedBalance;
    /**
     * The withdraw delay is the time (in seconds) required to withdraw funds, i.e. the time
     * between {initiateWithdrawal} and {withdraw}). It is computed as:
     * `max(MIN_WITHDRAW_DELAY, minDelay, maxDelay - (block.timestamp - lastDecreaseTimestamp))`.
     * Invariant: `minDelay == maxDelay == 0 || MIN_WITHDRAW_DELAY <= minDelay <= maxDelay`
     */
    uint64 maxDelay;
    /**
     * cf. {maxDelay}
     */
    uint64 minDelay;
    /**
     * Earliest time at which them most recently initiated withdrawal can be executed, or 0 if all
     * withdrawals have been entirely processed.
     * Invariant: `(unlockedBalance > 0) ==> (withdrawalTimestamp > 0)`
     */
    uint64 withdrawalTimestamp;
    /**
     * Reference timestamp for computing the time elapsed since a decrease was initiated, or 0 if
     * no decreases have ever been made.
     *
     * Note that a decrease can inherit the reference timestamp of a previous decrease
     * to preserve the previous' decrease progress — therefore this might not match up with
     * the actual timestamp of the latest decrease operation.
     */
    uint64 lastDecreaseTimestamp;
}

/**
 * This contracts maintains staking balances for accounts.
 *
 * It was written for as a part of the {core/EntryPoint} with the purpose of holding paymasters'
 * spending balances and serve as an anti-griefing/sybil mechanism via the withdrawal delays.
 * However, the logic here is generic and can be used for other purposes.
 *
 * Accounts deposit stake (in gas tokens) into the contract. Each account has an associated withdraw
 * delay, which is the time it has to wait between initiating and completing a withdrawal.
 *
 * An account can perform five operations:
 * - {deposit}
 * - {updateWithdrawDelay}
 * - {initiateWithdrawal}
 * - {withdraw}
 *
 * The withdraw delay can be increased instantly, but it cannot be decreased instantly (which would
 * defeat its purpose). Instead increasing or decreasing the withdraw delay actually
 * increases/decreases the "minimum withdraw delay". The withdraw delay linearly decreases until it
 * reaches this target minimum. This ensures that any withdrawal done at the same time as a withdraw
 * delay decrease will still have to wait for the proper delay.
 *
 * A minimum withdraw delay of one minute is enforced in all cases.
 *
 * This improves on the ERC-4337 staking design by enabling withdraw delays to decrease, while
 * retaining the ability of using the staked balance for payments. In ERC-4337, the entire stake
 * must be unstaked before the withdraw delay can be decreased.
 *
 * @dev The formula for the withdraw delay is:
 * `max(MIN_WITHDRAW_DELAY, minDelay, maxDelay - (block.timestamp - lastDecreaseTimestamp))`
 */
contract Staking {
    /// Staking information for accounts.
    mapping(address account => Stake) public stakes;

    /// Minimum unlock time (1 minute).
    uint64 public constant MIN_WITHDRAW_DELAY = 60;

    /// When trying to set the withdraw delay to a value shorter than {MIN_WITHDRAW_DELAY} or
    /// shorter than {stake.minDelay}.
    error WithdrawDelayTooShort();

    /// When trying to set the withdraw delay to a value longer than the current withdraw delay.
    error WithdrawDelayTooLong();

    /// When withdrawing and the balance is insufficient (either when initializing or completing a
    /// withdrawal).
    error InsufficientBalance();

    /// When withdrawing before the withdraw delay has elapsed.
    error EarlyWithdraw();

    event StakeDeposited(address account, address source, uint256 deposited);
    event StakeUnlocked(address account, uint256 unlocked);
    event StakeWithdrawn(address account, address destination, uint256 withdrawn);
    event WithdrawDelayUpdated(address account, uint64 unlockDelay);

    // NOTE: All functions are safe if the stake struct is uninitialized.

    /**
     * Returns the staked balance of an account.
     */
    function balanceOf(address account) external view returns (uint128) {
        return stakes[account].balance;
    }

    /**
     * Called to deposit funds into an account.
     */
    function deposit(address account) public payable {
        stakes[account].balance += uint128(msg.value);
        if (stakes[msg.sender].maxDelay == 0) {
            stakes[msg.sender].minDelay = MIN_WITHDRAW_DELAY;
            stakes[msg.sender].maxDelay = MIN_WITHDRAW_DELAY;
        }
        emit StakeDeposited(account, msg.sender, msg.value);
    }

    /**
     * Returns the withdraw delay, time (in seconds) required to withdraw funds, i.e. the time
     * between {initiateWithdrawal} and {withdraw}). It is computed as:
     * `max(minDelay, maxDelay - (block.timestamp - lastDecreaseTimestamp))`.
     */
    function getWithdrawDelay(address account) public view returns (uint64) {
        Stake storage stake = stakes[account];
        if (stake.maxDelay == stake.minDelay) return stake.maxDelay;
        uint256 timeElapsed = block.timestamp - stake.lastDecreaseTimestamp;
        if (timeElapsed >= stake.maxDelay - stake.minDelay) return stake.minDelay;
        return uint64(stake.maxDelay - timeElapsed);
    }

    /**
     * Called by an account to set the minimum withdraw delay. The maximum will be adjusted to match
     * if the current maximum withdraw delay is smaller than the new minimum withdraw delay.
     *
     * If decreasing, the withdraw delay ({withdrawDelay}) decreases linearly from the time this
     * function is called until it settles at the new minimum delay. Increasing or decreasing the
     * min delay after a previous decrease preserves the ongoing progress of the previous decrease.
     */
    function updateWithdrawDelay(uint64 withdrawDelay) external {
        Stake storage stake = stakes[msg.sender];
        uint64 prevMinDelay = stake.minDelay;

        if (withdrawDelay < MIN_WITHDRAW_DELAY || withdrawDelay < prevMinDelay) {
            revert WithdrawDelayTooShort();
        } else if (withdrawDelay >= prevMinDelay) {
            // min delay is increasing
            if (withdrawDelay >= stake.maxDelay) {
                stake.minDelay = withdrawDelay;
                stake.maxDelay = withdrawDelay;
            } else {
                stake.minDelay = withdrawDelay;
            }
            // preserve existing decrease timestamp and progress
        } else {
            // min delay is decreasing
            uint256 timeElapsed = block.timestamp - stake.lastDecreaseTimestamp;
            uint256 delayDiff = stake.maxDelay - prevMinDelay;
            if (timeElapsed > delayDiff) {
                // Decrease to previous minDelay is complete, start a new decrease to avoid
                // crediting the overtime of the previous decrease towards the new decrease.
                stake.minDelay = withdrawDelay;
                stake.maxDelay = prevMinDelay;
                stake.lastDecreaseTimestamp = uint64(block.timestamp);
            } else {
                // otherwise preserve existing decrease timestamp & progress
                stake.minDelay = withdrawDelay;
            }
        }

        emit WithdrawDelayUpdated(msg.sender, withdrawDelay);
    }

    /**
     * Initiate a withdrawal of the given staked amount, which will be available for withdrawal
     * after the the withdraw delay (computed at the time this function is called) elapses. If
     * another withdrawal was previously initiated but not fully completed, this will effectively
     * cancel the remainder of the previous withdrawal. No funds will be lost, but the time spent
     * waiting on the previous withdrawal will not carry over to the new withdrawal.
     */
    function initiateWithdrawal(uint128 amount) external {
        Stake memory stake = stakes[msg.sender];
        if (amount > stake.balance) revert InsufficientBalance();
        stake.unlockedBalance = amount;
        stake.withdrawalTimestamp = uint64(block.timestamp + getWithdrawDelay(msg.sender));
        stakes[msg.sender] = stake;
        emit StakeUnlocked(msg.sender, amount);
    }

    /**
     * Withdraw previously unlocked funds. It is possible to perform multiple partial withdrawals
     * of unlocked funds.
     */
    function withdraw(uint128 amount, address payable destination) external {
        Stake storage stake = stakes[msg.sender];
        if (amount > stake.unlockedBalance) revert InsufficientBalance();
        if (block.timestamp < stake.withdrawalTimestamp) revert EarlyWithdraw();
        stake.balance -= amount;
        stake.unlockedBalance -= amount;
        emit StakeWithdrawn(msg.sender, destination, amount);
        destination.transfer(amount);
    }

    /**
     * Transfers the requested amount of funds from the stake of the account to the specified
     * destination address. This will revert with an arithmetic exception if the account does not
     * hold sufficient stake.
     */
    function _transferTo(address account, address payable to, uint128 amount) internal {
        Stake storage stake = stakes[account];
        stake.balance -= amount;
        uint128 balance = stake.balance;
        if (stake.unlockedBalance > balance) stake.unlockedBalance = balance;
        to.transfer(amount);
    }
}
