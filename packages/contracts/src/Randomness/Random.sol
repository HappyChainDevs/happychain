// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {RandomCommitment} from "./RandomCommitment.sol";
import {Drand} from "./Drand.sol";

contract Random is RandomCommitment, Drand {
    uint256 public constant DRAND_DELAY = 2;
    uint256 public happyGenesisTimestamp;
    uint256 public happyTimeBlock;

    constructor(
        uint256[4] memory _publicKey,
        uint256 _genesisTimestamp,
        uint256 _period,
        uint256 _happyGenesisTimestamp,
        uint256 _happyTimeBlock
    ) RandomCommitment() Drand(_publicKey, _genesisTimestamp, _period) {
        happyGenesisTimestamp = _happyGenesisTimestamp;
        happyTimeBlock = _happyTimeBlock;
    }

    function random() external view returns (bytes32) {
        bytes32 drand = _getDrandAtTimestamp(block.timestamp - DRAND_DELAY);
        uint256 revealedValue = getRevealedValue(block.number);
        return keccak256(abi.encodePacked(drand, revealedValue));
    }

    function randomForTimestamp(uint256 timestamp) external view returns (bytes32) {
        return _getDrandAtTimestamp(timestamp - DRAND_DELAY);
    }

    function randomForBlock(uint256 blockNumber) external view returns (bytes32) {
        return _getDrandAtTimestamp(blockNumberToTimestamp(blockNumber));
    }

    function nextValidTimestamp(uint256 timestamp) public view returns (uint256) {
        return _nextValidTimestamp(timestamp - DRAND_DELAY) + DRAND_DELAY + 2 * drandPeriod;
    }

    function nextValidBlock(uint256 blockNumber) public view returns (uint256) {
        return timestampToBlockNumber(nextValidTimestamp(blockNumberToTimestamp(blockNumber)));
    }

    function blockNumberToTimestamp(uint256 blockNumber) internal view returns (uint256) {
        return happyGenesisTimestamp + (blockNumber - 1) * happyTimeBlock;
    }

    function timestampToBlockNumber(uint256 timestamp) internal view returns (uint256) {
        return (timestamp - happyGenesisTimestamp) / happyTimeBlock + 1;
    }
}
