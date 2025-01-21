// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HappyCounter {
    // Counter stored at slot 0
    // We'll use assembly to interact with it directly

    // Get the current count
    function getCount() public view returns (uint256 count) {
        assembly {
            // Load value from slot 0
            count := sload(0)
        }
    }

    // Increment the counter
    function increment() public {
        assembly {
            // Load current value
            let current := sload(0)
            // Increment
            let newCount := add(current, 1)
            // Store new value
            sstore(0, newCount)
        }
    }

    // Reset counter to 0
    function reset() public {
        assembly {
            // Store 0 in slot 0
            sstore(0, 0)
        }
    }
}
