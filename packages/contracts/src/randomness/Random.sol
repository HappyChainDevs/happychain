// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {RandomCommitment} from "./RandomCommitment.sol";
import {Drand} from "./Drand.sol";

contract Random is RandomCommitment, Drand {
    /*
    * This is the amount of time by which we delay reading the values from the Drand network. 
    * This approach is implemented to avoid issues when posting Drand values to the network 
    * in blocks where the Drand network period coincides with the Happy Chain period. 
    * For example, if there is a block at timestamp 6 and a new Drand value is also generated at timestamp 6,
    * we would read the last Drand value generated before timestamp 6 - DRAND_DELAY.
    */
    uint256 public constant DRAND_DELAY = 2;
    uint256 public immutable HAPPY_GENESIS_TIMESTAMP;
    uint256 public immutable HAPPY_BLOCK_TIME;

    constructor(
        uint256[4] memory _drandPublicKey,
        uint256 _drandGenesisTimestamp,
        uint256 _drandPeriod,
        uint256 _happyGenesisTimestamp,
        uint256 _happyBlockTime
    ) RandomCommitment() Drand(_drandPublicKey, _drandGenesisTimestamp, _drandPeriod) {
        HAPPY_GENESIS_TIMESTAMP = _happyGenesisTimestamp;
        HAPPY_BLOCK_TIME = _happyBlockTime;
    }

    /**
     * @notice Returns a safe random bytes32 value that changes every block
     * @dev The random value is generated from the drand randomness at the timestamp when the block was generated
     * and the revealed value at the current block number.
     */
    function random() external view returns (bytes32 randomValue) {
        bytes32 drand = _getDrandAtTimestamp(uint128(block.timestamp - DRAND_DELAY));
        uint128 revealedValue = getRevealedValue(uint128(block.number));
        randomValue = keccak256(abi.encodePacked(drand, revealedValue));
    }

    /**
     * @notice Returns the latest drand randomness at the given timestamp.
     * @dev The drand randomness associated with the timestamp when the block was generated will differ
     * from the one provided directly by the drand network.
     * This discrepancy exists because we introduce a security margin (DRAND_DELAY seconds) to ensure
     * the drand value can be safely included in a block.
     */
    function randomForTimestamp(uint256 timestamp) external view returns (bytes32) {
        return _getDrandAtTimestamp(timestamp - DRAND_DELAY);
    }

    /**
     * @notice Returns the next timestamp where the drand randomness is guaranteed to be unknown.
     * This ensures that at the returned timestamp, no one can have prior knowledge of the drand randomness,
     * maintaining its unpredictability.
     * @param timestamp The timestamp from which to calculate the next valid timestamp.
     * @return nextValidTimestamp The next timestamp where the drand randomness remains unrevealed.
     */
    function nextValidTimestamp(uint256 timestamp) public view returns (uint256) {
        return _nextValidDrandTimestamp(timestamp - DRAND_DELAY) + DRAND_DELAY + 2 * DRAND_PERIOD;
    }
}
