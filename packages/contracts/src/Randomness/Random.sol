// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {RandomCommitment} from "./RandomCommitment.sol";
import {Drand} from "./Drand.sol";

contract Random is RandomCommitment, Drand {
    uint256 public constant DRAND_DELAY = 2;
    uint256 public immutable HAPPY_GENESIS_BLOCK;
    uint256 public immutable HAPPY_TIME_BLOCK;

    constructor(
        uint256[4] memory _publicKey,
        uint256 _genesisTimestamp,
        uint256 _period,
        uint256 _happyGenesisBlock,
        uint256 _happyTimeBlock
    ) RandomCommitment() Drand(_publicKey, _genesisTimestamp, _period) {
        HAPPY_GENESIS_BLOCK = _happyGenesisBlock;
        HAPPY_TIME_BLOCK = _happyTimeBlock;
    }

    /**
     * @notice Returns a safe random bytes32 value that changes every block
     * @dev The random value is generated from the drand randomness at the timestamp when the block was generated
     * and the revealed value at the current block number.
     * @return randomValue A random bytes32 value
     */
    function random() external view returns (bytes32 randomValue) {
        bytes32 drand = _getDrandAtTimestamp(block.timestamp - DRAND_DELAY);
        uint256 revealedValue = getRevealedValue(block.number);
        randomValue = keccak256(abi.encodePacked(drand, revealedValue));
    }

    /**
     * @notice Returns the latest drand randomness at the given timestamp.
     * @dev The drand randomness associated with the timestamp when the block was generated will differ
     * from the one provided directly by the drand network.
     * This discrepancy exists because we introduce a security margin (DRAND_DELAY seconds) to ensure
     * the drand value can be safely included in a block.
     * @param timestamp The timestamp at which to fetch the drand randomness
     * @return drandRandomness The last drand randomness at the given timestamp
     */
    function randomForTimestamp(uint256 timestamp) external view returns (bytes32) {
        return _getDrandAtTimestamp(timestamp - DRAND_DELAY);
    }

    /**
     * @notice Returns the latest drand value at the specified block number.
     * @dev The drand randomness associated with the timestamp when the block was generated will differ
     * from the one provided directly by the drand network.
     * This discrepancy exists because we introduce a security margin (DRAND_DELAY seconds) to ensure
     * the drand value can be safely included in a block.
     * @param blockNumber The block number for which to retrieve the drand randomness.
     * @return drandRandomness The latest drand randomness at the specified block number.
     */
    function randomForBlock(uint256 blockNumber) external view returns (bytes32) {
        return _getDrandAtTimestamp(blockNumberToTimestamp(blockNumber));
    }

    /**
     * @notice Returns the next block number where the drand randomness is guaranteed to be unknown.
     * This ensures that at the returned block, no one can have prior knowledge of the drand randomness,
     * maintaining its unpredictability.
     * @param blockNumber The block number from which to calculate the next valid block.
     * @return nextValidBlockNumber The next block number where the drand randomness remains unrevealed.
     */
    function nextValidBlock(uint256 blockNumber) external view returns (uint256) {
        return timestampToBlockNumber(nextValidTimestamp(blockNumberToTimestamp(blockNumber)));
    }

    /**
     * @notice Returns the next timestamp where the drand randomness is guaranteed to be unknown.
     * This ensures that at the returned timestamp, no one can have prior knowledge of the drand randomness,
     * maintaining its unpredictability.
     * @param timestamp The timestamp from which to calculate the next valid timestamp.
     * @return nextValidTimestamp The next timestamp where the drand randomness remains unrevealed.
     */
    function nextValidTimestamp(uint256 timestamp) public view returns (uint256) {
        return _nextValidTimestamp(timestamp - DRAND_DELAY) + DRAND_DELAY + 2 * drandPeriod;
    }

    function blockNumberToTimestamp(uint256 blockNumber) internal view returns (uint256) {
        return HAPPY_GENESIS_BLOCK + (blockNumber - 1) * HAPPY_TIME_BLOCK;
    }

    function timestampToBlockNumber(uint256 timestamp) internal view returns (uint256) {
        return (timestamp - HAPPY_GENESIS_BLOCK) / HAPPY_TIME_BLOCK + 1;
    }
}
