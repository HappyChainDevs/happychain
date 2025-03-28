// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

/**
 * Information about an address's stake in {Staking}.
 */
struct Stake {
    /**
     * Staked balance.
     */
    uint256 balance;
    /**
     * Balance available for withdrawal after the withdraw delay, starting from {withdrawtimestamp}.
     */
    uint256 unlockedBalance;
    /**
     * The withdraw delay is the time (in seconds) required to withdraw funds, i.e. the time
     * between {initiateWithdrawal} and {withdraw}). It is computed as:
     * `max(MIN_WITHDRAW_DELAY, minDelay, maxDelay - (block.timestamp - lastDecreaseTimestamp))`.
     * Invariant: `minDelay == maxDelay == 0 || MIN_WITHDRAW_DELAY <= minDelay <= maxDelay`
     */
    uint64 maxDelay;
    uint64 minDelay;
    /**
     * Time at which the latest withdrawal was initiated, or 0 if all withdrawals have been
     * entirely processed.
     * Invariant: `(withdrawalTimestamp > 0) == (unlockedBalance > 0)`
     */
    uint64 withdrawalTimestamp;
    /**
     * Reference timestamp for compute the time elapsed since a decrease was initiated, or 0 if
     * no delay decrease is currently ongoing or requires update of the Stake struct.
     * Invariant: `(lastDelayTimestamp == 0) == (maxDelay == minDelay)`
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
 * It was written for as a part of the {HappyEntryPoint} with the purpose of holding paymasters'
 * spending balances and serve as an anti-griefing/sybil mechanism via the withdrawal delays.
 * However, the logic here is generic and can be used for other purposes.
 *
 * Accounts deposit stake (in gas tokens) into the contract. Each account has an associated withdraw
 * delay, which is the time it has to wait between initiating and completing a withdrawal.
 *
 * An account can perform five operations:
 * - {deposit}
 * - {increaseWithdrawDelay}
 * - {decreaseWithdrawDelay}
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

    event StakeDeposit(address account, uint256 deposited);
    event StakeUnlock(address account, uint256 unlocked);
    event StakeWithdrawal(address account, uint256 withdrawn);
    event WithdrawDelayIncrease(address account, uint64 unlockDelay);
    event WithdrawDelayDecrease(address account, uint64 unlockDelay);

    /**
     * Called by an account to stake funds, which are passed as value.
     */
    function deposit() external payable {
        stakes[msg.sender].balance += msg.value;
        if (stakes[msg.sender].maxDelay == 0) {
            stakes[msg.sender].minDelay = MIN_WITHDRAW_DELAY;
            stakes[msg.sender].maxDelay = MIN_WITHDRAW_DELAY;
        }
        emit StakeDeposit(msg.sender, msg.value);
    }

    /**
     * Returns the withdraw delay, time (in seconds) required to withdraw funds, i.e. the time
     * between {initiateWithdrawal} and {withdraw}). It is computed as:
     * `max(minDelay, maxDelay - (block.timestamp - lastDecreaseTimestamp))`.
     */
    function getWithdrawDelay(address account) public view returns (uint64) {
        Stake memory stake = stakes[account];
        if (stake.maxDelay == stake.minDelay) return stake.maxDelay;
        uint256 timeElapsed = block.timestamp - stake.lastDecreaseTimestamp;
        if (timeElapsed >= stake.maxDelay - stake.minDelay) return stake.minDelay;
        return uint64(stake.maxDelay - timeElapsed);
    }

    /**
     * Called by an account to increase the minimum withdraw delay.
     */
    function increaseWithdrawDelay(uint64 withdrawDelay) external {
        Stake memory stake = stakes[msg.sender];
        // will revert if uninitialized
        if (withdrawDelay <= MIN_WITHDRAW_DELAY || withdrawDelay <= stake.minDelay) revert WithdrawDelayTooShort();
        if (stake.maxDelay == stake.minDelay) {
            stakes[msg.sender].maxDelay = withdrawDelay;
            stakes[msg.sender].minDelay = withdrawDelay;
        } else {
            uint256 timeElapsed = block.timestamp - stake.lastDecreaseTimestamp;
            uint256 delayDiff = stake.maxDelay - withdrawDelay;
            if (timeElapsed > delayDiff) {
                stakes[msg.sender].maxDelay = withdrawDelay;
                stakes[msg.sender].minDelay = withdrawDelay;
                stakes[msg.sender].lastDecreaseTimestamp = 0;
            } else {
                stakes[msg.sender].minDelay = withdrawDelay;
            }
        }
        emit WithdrawDelayIncrease(msg.sender, withdrawDelay);
    }

    /**
     * Called by an account to decrease the minimum withdraw delay.
     *
     * The withdraw delay ({withdrawDelay}) decreases linearly from the time this function is
     * called until it settles at the new minimum delay. Decreasing after a previous decrease
     * preserves the ongoing progress of the previous decrease.
     */
    function decreaseWithdrawDelay(uint64 withdrawDelay) external {
        if (withdrawDelay < MIN_WITHDRAW_DELAY) revert WithdrawDelayTooShort();
        Stake memory stake = stakes[msg.sender];
        // will revert if uninitialized
        if (withdrawDelay >= stake.minDelay) revert WithdrawDelayTooLong();
        if (stake.maxDelay == stake.minDelay) {
            stakes[msg.sender].minDelay = withdrawDelay;
            stakes[msg.sender].lastDecreaseTimestamp = uint64(block.timestamp);
        } else {
            uint256 timeElapsed = block.timestamp - stake.lastDecreaseTimestamp;
            uint256 delayDiff = stake.maxDelay - stake.minDelay;
            if (timeElapsed > delayDiff) {
                // previous decrease is complete, start a new one
                stakes[msg.sender].maxDelay = stake.minDelay;
                stakes[msg.sender].minDelay = withdrawDelay;
                stakes[msg.sender].lastDecreaseTimestamp = uint64(block.timestamp);
            } else {
                // inherit timestamp of previous decrease
                stakes[msg.sender].minDelay = withdrawDelay;
            }
        }
        emit WithdrawDelayDecrease(msg.sender, withdrawDelay);
    }

    /**
     * Initiate a withdrawal of the given staked amount, which will be available for withdrawal
     * after the the withdraw delay (computed at the time this function is called) elapses. If
     * another withdrawal was previously initiated but not fully completed, this will effectively
     * cancel the remainder of the previous withdrawal. No funds will be lost, but the time spent
     * waiting on the previous withdrawal will not carry over to the new withdrawal.
     */
    function initiateWithdrawal(uint256 amount) external payable {
        Stake memory stake = stakes[msg.sender];
        if (amount > stake.balance) revert InsufficientBalance();
        stake.unlockedBalance = amount;
        stake.withdrawalTimestamp = uint64(block.timestamp);
        stakes[msg.sender] = stake;
        emit StakeUnlock(msg.sender, amount);
    }

    /**
     * Withdraw previously unlocked funds. It is possible to perform multiple partial withdrawals
     * of unlocked funds.
     */
    function withdraw(uint256 amount) external payable {
        Stake memory stake = stakes[msg.sender];
        if (amount > stake.unlockedBalance) revert InsufficientBalance();

        uint256 withdrawDelay;
        if (stake.maxDelay == stake.minDelay) {
            withdrawDelay = stake.maxDelay;
        } else {
            uint256 elapsedSinceDecrease = block.timestamp - stake.lastDecreaseTimestamp;
            uint256 delayDiff = stake.maxDelay - stake.minDelay;
            if (elapsedSinceDecrease >= delayDiff) {
                // previous decrease is complete, normalize
                stake.maxDelay = stake.minDelay;
                stake.lastDecreaseTimestamp = 0;
                withdrawDelay = stake.minDelay;
            } else {
                withdrawDelay = stake.maxDelay - elapsedSinceDecrease;
            }
        }

        uint256 timeElapsed = block.timestamp - stake.withdrawalTimestamp;
        if (timeElapsed < withdrawDelay) revert EarlyWithdraw();

        stake.balance -= amount;
        stake.unlockedBalance -= amount;
        if (stake.unlockedBalance == 0) stake.withdrawalTimestamp = 0;
        stakes[msg.sender] = stake;
        emit StakeWithdrawal(msg.sender, amount);
        payable(msg.sender).transfer(amount);
    }

    /**
     * Transfers the requested amount of funds from the stake of the account to the specified
     * destination address. This will revert with an arithmetic exception if the account does not
     * hold sufficient stake.
     */
    function _transferTo(address account, address payable to, uint256 amount) internal {
        stakes[account].balance -= amount;
        uint256 balance = stakes[account].balance;
        if (stakes[account].unlockedBalance > balance) stakes[account].unlockedBalance = balance;
        to.transfer(amount);
    }
}
