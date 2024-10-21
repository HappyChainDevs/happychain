// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin/access/Ownable.sol";

contract Random is Ownable {
    uint256 public constant PRECOMMIT_DELAY = 10;
    uint256 public constant BLOCK_TIME = 2;

    uint256 private currentRevealedValue;
    uint256 private currentRevealTimestamp;
    mapping(uint256 timestamp => bytes32) private commitments;

    event CommitmentPosted(uint256 indexed timestamp, bytes32 commitment);
    event ValueRevealed(uint256 indexed timestamp, uint256 revealedValue);

    error CommitmentTooLate();
    error CommitmentAlreadyExists();
    error NoCommitmentFound();
    error RevealMustBeOnExactBlock();
    error InvalidReveal();
    error RevealedValueNotAvailable();

    constructor() Ownable(msg.sender) {}

    function postCommitment(uint256 timestamp, bytes32 commitmentHash) external onlyOwner {
        if (block.timestamp > timestamp - PRECOMMIT_DELAY) {
            revert CommitmentTooLate();
        }

        if (commitments[timestamp] != 0) {
            revert CommitmentAlreadyExists();
        }

        commitments[timestamp] = commitmentHash;
        emit CommitmentPosted(timestamp, commitmentHash);
    }

    function revealValue(uint256 timestamp, uint256 revealedValue) external onlyOwner {
        bytes32 storedCommitment = commitments[timestamp];

        if (storedCommitment == 0) {
            revert NoCommitmentFound();
        }

        if (block.timestamp != timestamp) {
            revert RevealMustBeOnExactBlock();
        }

        if (storedCommitment != keccak256(abi.encodePacked(revealedValue))) {
            revert InvalidReveal();
        }

        currentRevealedValue = revealedValue;
        currentRevealTimestamp = timestamp;
        delete commitments[timestamp];
        emit ValueRevealed(timestamp, revealedValue);
    }

    function unsafeGetRevealedValue(uint256 timestamp) external view returns (uint256) {
        if (currentRevealTimestamp != timestamp) {
            return 0;
        }

        return currentRevealedValue;
    }

    function getRevealedValue(uint256 timestamp) external view returns (uint256) {
        if (currentRevealTimestamp != timestamp) {
            revert RevealedValueNotAvailable();
        }

        return currentRevealedValue;
    }
}
