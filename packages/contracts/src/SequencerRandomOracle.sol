// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin/access/Ownable.sol";

contract SequencerRandomOracle is Ownable {
    uint256 public constant SEQUENCER_TIMEOUT = 10;
    uint256 public constant PRECOMMIT_DELAY = 10;

    struct Commitment {
        bytes32 commitmentHash;
        bool revealed;
        bytes32 revealedValue;
    }

    mapping(uint256 => Commitment) private commitments;
    uint256 public lastRevealedTimestamp;

    event CommitmentPosted(uint256 indexed timestamp, bytes32 commitmentHash);
    event ValueRevealed(uint256 indexed timestamp, bytes32 revealedValue);

    error CommitmentTooLate();
    error CommitmentAlreadyExists();
    error NoCommitmentFound();
    error ValueAlreadyRevealed();
    error NonLinearReveal();
    error RevealTimeoutExceeded();
    error InvalidReveal();
    error SequencerValueNotAvailable();

    constructor() Ownable(msg.sender) {}

    function postCommitment(uint256 timestamp, bytes32 commitmentHash) external onlyOwner {
        if (block.timestamp > timestamp - PRECOMMIT_DELAY) revert CommitmentTooLate();
        if (commitments[timestamp].commitmentHash != bytes32(0)) revert CommitmentAlreadyExists();

        commitments[timestamp] = Commitment(commitmentHash, false, bytes32(0));

        emit CommitmentPosted(timestamp, commitmentHash);
    }

    function revealValue(uint256 timestamp, bytes32 revealedValue) external onlyOwner {
        Commitment storage commitment = commitments[timestamp];

        if (commitment.commitmentHash == bytes32(0)) {
            revert NoCommitmentFound();
        }

        if (commitment.revealed) {
            revert ValueAlreadyRevealed();
        }

        if (timestamp <= lastRevealedTimestamp) {
            revert NonLinearReveal();
        }

        if (block.timestamp > timestamp + SEQUENCER_TIMEOUT) {
            revert RevealTimeoutExceeded();
        }

        if (commitment.commitmentHash != keccak256(abi.encodePacked(revealedValue))) {
            revert InvalidReveal();
        }

        commitment.revealed = true;
        commitment.revealedValue = revealedValue;

        lastRevealedTimestamp = timestamp;

        emit ValueRevealed(timestamp, revealedValue);
    }

    function unsafeGetSequencerValue(uint256 timestamp) external view returns (bytes32) {
        Commitment storage commitment = commitments[timestamp];

        if (!commitment.revealed) {
            return bytes32(0);
        }

        return commitment.revealedValue;
    }

    function getSequencerValue(uint256 timestamp) external view returns (bytes32) {
        Commitment storage commitment = commitments[timestamp];

        if (!commitment.revealed) {
            revert SequencerValueNotAvailable();
        }

        return commitment.revealedValue;
    }

    function willSequencerValueBeAvailable(uint256 timestamp) external view returns (bool) {
        Commitment storage commitment = commitments[timestamp];

        if (commitment.commitmentHash == bytes32(0) && block.timestamp > timestamp + SEQUENCER_TIMEOUT) {
            return false;
        }

        if (commitment.commitmentHash != bytes32(0) && block.timestamp > timestamp - PRECOMMIT_DELAY) {
            return false;
        }

        return true;
    }
}
