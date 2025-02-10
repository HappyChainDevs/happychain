// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {RandomCommitment} from "./RandomCommitment.sol";
import {Drand} from "./Drand.sol";

contract Random is RandomCommitment, Drand {
    uint256 public constant DRAND_DELAY = 6;

    constructor(uint256[4] memory _publicKey, uint256 _genesisTimestamp, uint256 _period)
        RandomCommitment()
        Drand(_publicKey, _genesisTimestamp, _period)
    {}

    function random() external view returns (bytes32) {
        bytes32 drand = _getDrandAtTimestamp(block.timestamp - DRAND_DELAY);
        uint256 revealedValue = getRevealedValue(block.number);
        return keccak256(abi.encodePacked(drand, revealedValue));
    }

    function randomForTimestamp(uint256 timestamp) external view returns (bytes32) {
        return _getDrandAtTimestamp(timestamp);
    }

    function nextValidTimestamp(uint256 timestamp) public view returns (uint256) {
        return _nextValidTimestamp(timestamp);
    }
}
