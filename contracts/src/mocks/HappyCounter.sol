// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HappyCounter {
    mapping(address => uint256) private _count;

    // Get the current count
    function getCount() public view returns (uint256 count) {
        return _count[msg.sender];
    }

    // Increment the counter
    function increment() public {
        _count[msg.sender]++;
    }

    // Reset counter to 0
    function reset() public {
        _count[msg.sender] = 0;
    }
}
