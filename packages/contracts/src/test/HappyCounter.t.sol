// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {HappyCounter} from "../mocks/HappyCounter.sol";

contract AssemblyCounterTest is Test {
    HappyCounter public counter;

    event CounterReset();

    function setUp() public {
        counter = new HappyCounter();
    }

    function testInitialCount() public {
        assertEq(counter.getCount(), 0, "Initial count should be 0");
    }

    function testIncrement() public {
        counter.increment();
        assertEq(counter.getCount(), 1, "Count should be 1 after increment");
    }

    function testMultipleIncrements() public {
        uint256 numIncrements = 5;
        for (uint256 i = 0; i < numIncrements; i++) {
            counter.increment();
        }
        assertEq(counter.getCount(), numIncrements, "Count should match number of increments");
    }

    function testReset() public {
        // First increment a few times
        counter.increment();
        counter.increment();
        counter.increment();

        // Verify count is 3
        assertEq(counter.getCount(), 3, "Count should be 3 before reset");

        // Reset and verify
        counter.reset();
        assertEq(counter.getCount(), 0, "Count should be 0 after reset");
    }

    function testIncrementFuzz(uint8 numIncrements) public {
        uint256 expectedCount = 0;
        for (uint256 i = 0; i < numIncrements; i++) {
            counter.increment();
            expectedCount++;
        }
        assertEq(counter.getCount(), expectedCount, "Count should match fuzz increments");
    }

    function testResetAfterFuzz(uint8 numIncrements) public {
        // First do some random increments
        for (uint256 i = 0; i < numIncrements; i++) {
            counter.increment();
        }

        // Reset and verify
        counter.reset();
        assertEq(counter.getCount(), 0, "Count should be 0 after reset regardless of previous count");
    }
}
