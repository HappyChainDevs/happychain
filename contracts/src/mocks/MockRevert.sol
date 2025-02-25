// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockRevert {
    error CustomErrorMockRevert();

    function revert() public {
        revert CustomErrorMockRevert();
    }

    function revertDueToGasLimit() public {
        uint256 i = 0;
        while (true) {
            i++;
        }
    }
}
