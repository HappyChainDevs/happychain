// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {Staking, Stake} from "../../../happy-accounts/core/Staking.sol";

contract StakingTest is Test {
    Staking internal staking;

    function setUp() public {
        staking = new Staking();
    }

    function testDeposit() public {
        assertEq(_getStake(address(this)).balance, 0);
        _deposit(100);

        assertEq(_getStake(address(this)).balance, 100);
        assertEq(_getStake(address(this)).unlockedBalance, 0);

        assertEq(staking.getWithdrawDelay(address(this)), 60);
    }

    function testIncreaseWithdrawDelay() public {
        _deposit(100);
        assertEq(staking.getWithdrawDelay(address(this)), 60);

        // allowed increase by any amount
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

        // cannot decrease less than min delay
        staking.increaseWithdrawDelay(90);
        assertEq(_getStake(address(this)).minDelay, 90);
        assertEq(_getStake(address(this)).maxDelay, 90);
        assertEq(_getStake(address(this)).lastDecreaseTimestamp, 0);
        vm.expectRevert(Staking.WithdrawDelayTooLong.selector);
        staking.decreaseWithdrawDelay(100);

        //
        uint64 time1 = uint64(block.timestamp);
        staking.decreaseWithdrawDelay(80);
        assertEq(staking.getWithdrawDelay(address(this)), 90); // still set to previous value
        assertEq(_getStake(address(this)).maxDelay, 90);
        assertEq(_getStake(address(this)).minDelay, 80);

        // roll forward, delay should be decreased to target
        vm.warp(time1 + 100);
        assertEq(staking.getWithdrawDelay(address(this)), 80);
        assertEq(_getStake(address(this)).lastDecreaseTimestamp, time1);
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

        // cannot withdraw more than balance
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
        assertEq(_getStake(address(this)).withdrawalTimestamp,0); // full withdrawal always resets withdrawal timestamp
        uint256 balanceAfter = address(this).balance;
        assertEq(balanceAfter - balanceBefore, 100);
    }
    
    function testPartialWithdrawal() external {
        _deposit(100);
        uint64 initiateWithdrawalTime = _now();
        console.log("initiateWithdrawalTime", initiateWithdrawalTime); // removing this line will cause the test to fail
        staking.initiateWithdrawal(50);
        
        assertEq(_getStake(address(this)).balance, 100);
        assertEq(_getStake(address(this)).unlockedBalance, 50);
        
        vm.warp(block.timestamp + 100);
        
        uint256 balanceBefore = address(this).balance;
        staking.withdraw(40);
        assertEq(_getStake(address(this)).balance, 60);
        assertEq(_getStake(address(this)).unlockedBalance, 10);
        assertEq(_getStake(address(this)).withdrawalTimestamp, initiateWithdrawalTime);
        uint256 balanceAfter = address(this).balance;
        assertEq(balanceAfter - balanceBefore, 40);
    }

    // helpers

    function _now() internal view returns (uint64){
        return uint64(block.timestamp);
    }

    function _deposit(uint256 amount) internal {
        staking.deposit{value: amount}();
    }

    receive() external payable {}

    function _getStake(address account) internal view returns (Stake memory) {
        (
            uint256 balance,
            uint256 unlockedBalance,
            uint64 maxDelay,
            uint64 minDelay,
            uint64 withdrawalTimestamp,
            uint64 lastDecreaseTimestamp
        ) = staking.stakes(account);
        return Stake(balance, unlockedBalance, maxDelay, minDelay, withdrawalTimestamp, lastDecreaseTimestamp);
    }
}
