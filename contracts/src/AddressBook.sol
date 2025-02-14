// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin/access/Ownable.sol";

/**
 * This contract is used to retrieve the random contract address from the sequencer while constructing a new block,
 * in order to prioritize the transaction originating from the randomness owner and ensure that the reveal transaction
 * is included as the first transaction of the block, thereby making the randomness available for all transactions.
 */
contract AddressBook is Ownable {
    /**
     * It is very important that if we add new variables, we must maintain the `random` variable in the same storage slot.
     * Currently, it is stored at 0x01 and that is the slot that the sequencer uses to retrieve the address of the random contract.
     */
    address public random;

    constructor(address _owner, address _random) Ownable(_owner) {
        random = _random;
    }

    function setRandom(address _random) external onlyOwner {
        random = _random;
    }
}
