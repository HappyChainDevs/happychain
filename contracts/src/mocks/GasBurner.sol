// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {GasBurnerLib} from "solady/utils/GasBurnerLib.sol";

contract MockGasBurner {
    function burnGas(uint256 amount) public {
        GasBurnerLib.burn(amount);
    }
}
