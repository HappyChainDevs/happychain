// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {RandomCommitment} from "./RandomCommitment.sol";
import {Drand} from "./Drand.sol";

contract Random is RandomCommitment, Drand {
    /*
    * The amount of time in seconds by which we delay reading the values from the Drand network.
    * 
    * This is necessary, because whenever a Drand value is generated at time T, it is not possible to guarantee it 
    * will be posted on a block with timestamp T (even if such a block exists) because of network delays.
    */
    uint256 public constant DRAND_DELAY_SECONDS = 4;

    /**
     * The minimum amount of time (in seconds) that commitments to future Drand randomness must be made
     * in advance. This delay is relative to Drand timestamp (so DRAND_DELAY must also be added).
     *
     * This is used in the computation of nextValidTimestamp — always use that function to get a
     * lower bound on the timestamp to commit to.
     *
     * This is necessary to enable independent detection of sequencer delays which could signify that the
     * sequencer is waiting to know the Drand randomness before including a commitment to future Drand randomness.
     */
    uint256 public constant MIN_PRECOMMIT_TIME_SECONDS = 3;

    constructor(
        address _owner,
        uint256[4] memory _drandPublicKey,
        uint256 _drandGenesisTimestampSeconds,
        uint256 _drandPeriodSeconds,
        uint256 _precommitDelayBlocks
    )
        RandomCommitment(_owner, _precommitDelayBlocks)
        Drand(_drandPublicKey, _drandGenesisTimestampSeconds, _drandPeriodSeconds)
    {}

    /**
     * @notice Returns a safe random bytes32 value that changes every block
     * @dev The random value is generated from the drand randomness at the timestamp when the block was generated
     * and the revealed value at the current block number.
     */
    function random() external view returns (bytes32 randomValue) {
        bytes32 drand = _getDrandAtTimestamp(uint128(block.timestamp - DRAND_DELAY_SECONDS));
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
        return _getDrandAtTimestamp(timestamp - DRAND_DELAY_SECONDS);
    }

    /**
     * @notice Returns the next timestamp where the drand randomness is guaranteed to be unknown.
     * This ensures that at the returned timestamp, no one can have prior knowledge of the drand randomness,
     * maintaining its unpredictability.
     */
    function nextValidTimestamp(uint256 timestamp) public view returns (uint256) {
        return _nextValidDrandTimestamp(timestamp + MIN_PRECOMMIT_TIME_SECONDS - 1) + DRAND_DELAY_SECONDS;
    }
}
