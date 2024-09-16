// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin/access/Ownable.sol";

contract SequencerRandomOracle is Ownable {
    uint256 public constant SEQUENCER_TIMEOUT = 10;
    uint256 public constant PRECOMMIT_DELAY = 10;

    struct RandomValue {
        uint256 commitmentHash;
        uint256 revealedValue;
    }

    mapping(uint256 => RandomValue) private randomValues;
    uint256 public lastRevealedTimestamp;

    event CommitmentPosted(uint256 indexed timestamp, uint256 commitmentHash);
    event ValueRevealed(uint256 indexed timestamp, uint256 revealedValue);

    error CommitmentTooLate();
    error CommitmentAlreadyExists();
    error NoCommitmentFound();
    error ValueAlreadyRevealed();
    error NonLinearReveal();
    error RevealTimeoutExceeded();
    error InvalidReveal();
    error SequencerValueNotAvailable();

    constructor() Ownable(msg.sender) {}

    function postCommitment(uint256 timestamp, uint256 commitmentHash) external onlyOwner {
        if (block.timestamp > timestamp - PRECOMMIT_DELAY) {
            revert CommitmentTooLate();
        }

        if (randomValues[timestamp].commitmentHash != 0) {
            revert CommitmentAlreadyExists();
        }

        randomValues[timestamp] = RandomValue(commitmentHash, 0);

        emit CommitmentPosted(timestamp, commitmentHash);
    }

    function revealValue(uint256 timestamp, uint256 revealedValue) external onlyOwner {
        RandomValue storage randomValue = randomValues[timestamp];

        if (randomValue.commitmentHash == 0) {
            revert NoCommitmentFound();
        }

        if (randomValue.revealedValue != 0) {
            revert ValueAlreadyRevealed();
        }

        if (timestamp <= lastRevealedTimestamp) {
            revert NonLinearReveal();
        }

        if (block.timestamp > timestamp + SEQUENCER_TIMEOUT) {
            revert RevealTimeoutExceeded();
        }

        if (randomValue.commitmentHash != uint256(keccak256(abi.encodePacked(revealedValue)))) {
            revert InvalidReveal();
        }

        randomValue.revealedValue = revealedValue;
        lastRevealedTimestamp = timestamp;

        emit ValueRevealed(timestamp, revealedValue);
    }

    function unsafeGetSequencerValue(uint256 timestamp) external view returns (uint256) {
        RandomValue storage randomValue = randomValues[timestamp];

        return randomValue.revealedValue;
    }

    function getSequencerValue(uint256 timestamp) external view returns (uint256) {
        RandomValue storage randomValue = randomValues[timestamp];

        if (randomValue.revealedValue == 0) {
            revert SequencerValueNotAvailable();
        }

        return randomValue.revealedValue;
    }

    function willSequencerValueBeAvailable(uint256 timestamp) external view returns (bool) {
        RandomValue storage randomValue = randomValues[timestamp];

        if (randomValue.commitmentHash == 0) {
            return (timestamp >= block.timestamp - PRECOMMIT_DELAY);
        }

        if (randomValue.revealedValue == 0) {
            return block.timestamp > timestamp + SEQUENCER_TIMEOUT;
        }

        return true;
    }
}
