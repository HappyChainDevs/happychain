// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockRevert {
    error CustomErrorMockRevert();

    function intentionalRevert() public pure {
        revert CustomErrorMockRevert();
    }

    function intentionalRevertDueToGasLimit() public pure {
        uint256 i = 0;
        while (true) {
            i++;
        }
    }
}
