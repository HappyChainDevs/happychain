// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin/access/Ownable.sol";

contract Config is Ownable {
    address public random;

    constructor(address _random) Ownable(msg.sender) {
        random = _random;
    }

    function setRandom(address _random) external onlyOwner {
        random = _random;
    }
}
