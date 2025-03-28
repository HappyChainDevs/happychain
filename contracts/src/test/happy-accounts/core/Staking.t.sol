// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Staking, Stake} from "../../../happy-accounts/core/Staking.sol";

contract StakingTest is Test {
    Staking internal staking;

    uint64 private time1;

    function setUp() public {
        staking = new Staking();
        time1 = 0;
    }

    function testDeposit() public {
        _assertEmptyStake(address(this));

        _deposit(100);
        assertEq(_getStake(address(this)).balance, 100);
        assertEq(_getStake(address(this)).unlockedBalance, 0);
        assertEq(_getStake(address(this)).maxDelay, 60);
        assertEq(_getStake(address(this)).minDelay, 60);
        assertEq(_getStake(address(this)).withdrawalTimestamp, 0);
        assertEq(_getStake(address(this)).lastDecreaseTimestamp, 0);
        assertEq(staking.getWithdrawDelay(address(this)), 60);

        _deposit(200); //again
        assertEq(_getStake(address(this)).balance, 300);
        assertEq(_getStake(address(this)).unlockedBalance, 0);
        assertEq(_getStake(address(this)).maxDelay, 60);
        assertEq(_getStake(address(this)).minDelay, 60);
        assertEq(_getStake(address(this)).withdrawalTimestamp, 0);
        assertEq(_getStake(address(this)).lastDecreaseTimestamp, 0);
    }

    function testIncreaseWithdrawDelay() public {
        _deposit(100);
        assertEq(staking.getWithdrawDelay(address(this)), 60);

        // allowed increase by any amount greater than current delay
        staking.increaseWithdrawDelay(90);
        assertEq(staking.getWithdrawDelay(address(this)), 90);
        assertEq(_getStake(address(this)).maxDelay, 90);
        assertEq(_getStake(address(this)).minDelay, 90);
        assertEq(_getStake(address(this)).lastDecreaseTimestamp, 0);

        // cannot increase by less than current delay
        vm.expectRevert(Staking.WithdrawDelayTooShort.selector);
        staking.increaseWithdrawDelay(80);
    }

    function testDecreaseWithdrawDelay() public {
        _deposit(100);
        assertEq(staking.getWithdrawDelay(address(this)), 60);

        // cannot decrease less than one min
        vm.expectRevert(Staking.WithdrawDelayTooShort.selector);
        staking.decreaseWithdrawDelay(10);

        // increase delay from min so we can decrease
        staking.increaseWithdrawDelay(90);

        // cannot decrease more than already set min delay
        assertEq(_getStake(address(this)).minDelay, 90);
        assertEq(_getStake(address(this)).maxDelay, 90);
        assertEq(_getStake(address(this)).lastDecreaseTimestamp, 0);
        vm.expectRevert(Staking.WithdrawDelayTooLong.selector);
        staking.decreaseWithdrawDelay(100);

        // decrease withdraw delay
        uint64 depositDecreaseTimestamp = _now();
        staking.decreaseWithdrawDelay(80);
        assertEq(staking.getWithdrawDelay(address(this)), 90); // still set to previous value
        assertEq(_getStake(address(this)).maxDelay, 90);
        assertEq(_getStake(address(this)).minDelay, 80);

        // roll forward, delay should be completed and decreased to target
        vm.warp(depositDecreaseTimestamp + 100);
        assertEq(staking.getWithdrawDelay(address(this)), 80);
        assertEq(_getStake(address(this)).lastDecreaseTimestamp, depositDecreaseTimestamp);
    }

    function testDecreaseWithinDecrease() external {
        // _deposit(100);
        // increase delay from min so we can decrease
        staking.increaseWithdrawDelay(80);

        staking.decreaseWithdrawDelay(70); // trigger a fresh decrease
        assertEq(_getStake(address(this)).lastDecreaseTimestamp, _now());
        assertEq(_getStake(address(this)).minDelay, 70); // min delay should be updated
        assertEq(_getStake(address(this)).maxDelay, 80); // max delay is previous min delay
        assertEq(staking.getWithdrawDelay(address(this)), 80);

        // roll forward, but not enough time has passed to complete decrease
        vm.warp(_now() + 5); // extra 5 seconds is not enough to complete decrease
        assertEq(staking.getWithdrawDelay(address(this)), 75); // withdraw delay has changed linearly

        staking.decreaseWithdrawDelay(65); // trigger yet another decrease
        assertEq(_getStake(address(this)).lastDecreaseTimestamp, _now()); // did not change
        assertEq(_getStake(address(this)).minDelay, 65); // new min delay set
        assertEq(_getStake(address(this)).maxDelay, 80); // previous max delay respected
        assertEq(staking.getWithdrawDelay(address(this)), 75);

        // roll forward to complete decrease
        vm.warp(_now() + 5 + 5); // another 5 seconds still not enough
        assertEq(staking.getWithdrawDelay(address(this)), 70);
        vm.warp(_now() + 5 + 5 + 5); // another 5 seconds is enough to complete decrease
        assertEq(staking.getWithdrawDelay(address(this)), 65);
    }

    function testWithdraw() public {
        _deposit(100);
        assertEq(staking.getWithdrawDelay(address(this)), 60);
        assertEq(_getStake(address(this)).balance, 100);
        assertEq(_getStake(address(this)).unlockedBalance, 0);

        // cannot withdraw before delay
        vm.expectRevert(Staking.InsufficientBalance.selector);
        staking.withdraw(100);

        // fully withdraw after delay
        staking.initiateWithdrawal(100);
        vm.warp(block.timestamp + 100);
        uint256 balanceBefore = address(this).balance;
        staking.withdraw(100);
        assertEq(_getStake(address(this)).balance, 0);
        assertEq(_getStake(address(this)).unlockedBalance, 0);
        uint256 balanceAfter = address(this).balance;
        assertEq(balanceAfter - balanceBefore, 100);
    }

    function testInitiateWithdraw() public {
        _deposit(100);
        assertEq(staking.getWithdrawDelay(address(this)), 60);
        assertEq(_getStake(address(this)).balance, 100);
        assertEq(_getStake(address(this)).unlockedBalance, 0);

        // cannot withdraw before initiating withdraw
        vm.expectRevert(Staking.InsufficientBalance.selector);
        staking.withdraw(100);

        // cannot initiate withdraw with more than unlocked balance
        vm.expectRevert(Staking.InsufficientBalance.selector);
        staking.initiateWithdrawal(110);

        // initiate withdraw
        staking.initiateWithdrawal(100);
        assertEq(_getStake(address(this)).balance, 100);
        assertEq(_getStake(address(this)).unlockedBalance, 100);
        assertEq(_getStake(address(this)).withdrawalTimestamp, uint64(block.timestamp));

        // cannot withdraw before delay
        vm.expectRevert(Staking.EarlyWithdraw.selector);
        staking.withdraw(100);

        // can withdraw after delay
        vm.warp(block.timestamp + 100);
        uint256 balanceBefore = address(this).balance;
        staking.withdraw(100);
        assertEq(_getStake(address(this)).balance, 0);
        assertEq(_getStake(address(this)).unlockedBalance, 0);
        assertEq(_getStake(address(this)).withdrawalTimestamp, 0); // full withdrawal always resets withdrawal timestamp
        uint256 balanceAfter = address(this).balance;
        assertEq(balanceAfter - balanceBefore, 100);
    }

    function testPartialWithdrawal() external {
        _deposit(100);
        time1 = _now();
        // begin partial withdraw
        staking.initiateWithdrawal(50);
        assertEq(_getStake(address(this)).balance, 100);
        assertEq(_getStake(address(this)).unlockedBalance, 50);

        // cannot withdraw before delay
        vm.expectRevert(Staking.EarlyWithdraw.selector);
        staking.withdraw(50);

        // roll foward past delay and withdraw
        vm.warp(block.timestamp + 100);

        uint256 balanceBefore = address(this).balance;
        staking.withdraw(40);
        assertEq(_getStake(address(this)).balance, 60);
        assertEq(_getStake(address(this)).unlockedBalance, 10);
        assertEq(_getStake(address(this)).withdrawalTimestamp, time1);
        uint256 balanceAfter = address(this).balance;
        assertEq(balanceAfter - balanceBefore, 40);

        // withdraw remaining balance
        balanceBefore = address(this).balance;
        uint64 lastDecreaseTimestamp = _getStake(address(this)).lastDecreaseTimestamp;
        staking.withdraw(10);
        assertEq(_getStake(address(this)).balance, 50);
        assertEq(_getStake(address(this)).unlockedBalance, 0);
        assertEq(_getStake(address(this)).withdrawalTimestamp, 0);
        // last decrease timestamp should not be updated
        assertEq(_getStake(address(this)).lastDecreaseTimestamp, lastDecreaseTimestamp);
        balanceAfter = address(this).balance;
        assertEq(balanceAfter - balanceBefore, 10);
    }

    // helpers
    function _assertEmptyStake(address staker) internal view {
        Stake memory stake = _getStake(staker);
        assertEq(stake.balance, 0);
        assertEq(stake.unlockedBalance, 0);
        assertEq(stake.maxDelay, 0);
        assertEq(stake.minDelay, 0);
        assertEq(stake.withdrawalTimestamp, 0);
        assertEq(stake.lastDecreaseTimestamp, 0);
    }

    function _now() internal view returns (uint64) {
        return uint64(block.timestamp);
    }

    function _deposit(uint256 amount) internal {
        staking.deposit{value: amount}();
    }

    function _getStake(address account) internal view returns (Stake memory) {
        (
            uint128 balance,
            uint128 unlockedBalance,
            uint64 maxDelay,
            uint64 minDelay,
            uint64 withdrawalTimestamp,
            uint64 lastDecreaseTimestamp
        ) = staking.stakes(account);
        return Stake(balance, unlockedBalance, maxDelay, minDelay, withdrawalTimestamp, lastDecreaseTimestamp);
    }

    // contract must be able to recieve ether for withdrawal completion
    receive() external payable {}
}
