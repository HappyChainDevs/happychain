// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin/access/Ownable.sol";

contract RandomCommitment is Ownable {
    uint256 public constant PRECOMMIT_DELAY = 10;

    uint256 private currentRevealedValue;
    uint256 private currentRevealBlockNumber;
    mapping(uint256 blockNumber => bytes32) private commitments;

    event CommitmentPosted(uint256 indexed blockNumber, bytes32 commitment);
    event ValueRevealed(uint256 indexed blockNumber, uint256 revealedValue);

    error CommitmentTooLate();
    error CommitmentAlreadyExists();
    error NoCommitmentFound();
    error RevealMustBeOnExactBlock();
    error InvalidReveal();
    error RevealedValueNotAvailable();

    constructor() Ownable(msg.sender) {}

    function postCommitment(uint256 blockNumber, bytes32 commitmentHash) external onlyOwner {
        if (block.number > blockNumber - PRECOMMIT_DELAY) {
            revert CommitmentTooLate();
        }

        if (commitments[blockNumber] != 0) {
            revert CommitmentAlreadyExists();
        }

        commitments[blockNumber] = commitmentHash;
        emit CommitmentPosted(blockNumber, commitmentHash);
    }

    function revealValue(uint256 blockNumber, uint256 revealedValue) external onlyOwner {
        bytes32 storedCommitment = commitments[blockNumber];

        if (storedCommitment == 0) {
            revert NoCommitmentFound();
        }

        if (block.number != blockNumber) {
            revert RevealMustBeOnExactBlock();
        }

        if (storedCommitment != keccak256(abi.encodePacked(revealedValue))) {
            revert InvalidReveal();
        }

        currentRevealedValue = revealedValue;
        currentRevealBlockNumber = blockNumber;
        delete commitments[blockNumber];
        emit ValueRevealed(blockNumber, revealedValue);
    }

    function unsafeGetRevealedValue(uint256 blockNumber) public view returns (uint256) {
        if (currentRevealBlockNumber != blockNumber) {
            return 0;
        }

        return currentRevealedValue;
    }

    function getRevealedValue(uint256 blockNumber) public view returns (uint256) {
        if (currentRevealBlockNumber != blockNumber) {
            revert RevealedValueNotAvailable();
        }

        return currentRevealedValue;
    }
}
