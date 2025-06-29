// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin/access/Ownable.sol";

contract RandomCommitment is Ownable {
    struct CurrentReveal {
        uint128 value;
        uint128 blockNumber;
    }

    /**
     * @dev This delay ensures that the commitment is not submitted too late,
     * maintaining the unpredictability of the randomness. It should be set to
     * at least 12 hours to accommodate the sequencing window size.
     * For more details, please refer to:
     * https://specs.optimism.io/protocol/configurability.html#sequencing-window-size
     */
    uint256 public immutable PRECOMMIT_DELAY_BLOCKS;

    CurrentReveal private currentReveal;
    mapping(uint128 blockNumber => bytes32) private commitments;

    event CommitmentPosted(uint128 indexed blockNumber, bytes32 commitment);
    event ValueRevealed(uint128 indexed blockNumber, uint128 revealedValue);

    error CommitmentTooLate();
    error CommitmentAlreadyExists();
    error NoCommitmentFound();
    error RevealMustBeOnExactBlock();
    error InvalidReveal();
    error RevealedValueNotAvailable();

    constructor(address _owner, uint256 _precommitDelayBlocks) Ownable(_owner) {
        PRECOMMIT_DELAY_BLOCKS = _precommitDelayBlocks;
    }

    /**
     * @notice Posts a commitment for a specific block number.
     */
    function postCommitment(uint128 blockNumber, bytes32 commitmentHash) external onlyOwner {
        if (block.number + PRECOMMIT_DELAY_BLOCKS > blockNumber) {
            revert CommitmentTooLate();
        }

        if (commitments[blockNumber] != 0) {
            revert CommitmentAlreadyExists();
        }

        commitments[blockNumber] = commitmentHash;
        emit CommitmentPosted(blockNumber, commitmentHash);
    }

    /**
     * @notice Reveals the value for a specific block number.
     */
    function revealValue(uint128 blockNumber, uint128 revealedValue) external onlyOwner {
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

        currentReveal.value = revealedValue;
        currentReveal.blockNumber = blockNumber;
        delete commitments[blockNumber];
        emit ValueRevealed(blockNumber, revealedValue);
    }

    /**
     * @notice Retrieves the revealed value for a specific block number.
     * This function does not revert if the reveal is unavailable. Instead, it returns 0.
     */
    function unsafeGetRevealedValue(uint128 blockNumber) public view returns (uint128) {
        if (currentReveal.blockNumber != blockNumber) {
            return 0;
        }

        return currentReveal.value;
    }

    /**
     * @notice Retrieves the revealed value for a specific block number.
     * This function verifies that a reveal exists for the given block number before returning the value.
     * It reverts with `RevealedValueNotAvailable` if no valid reveal is found.
     */
    function getRevealedValue(uint128 blockNumber) public view returns (uint128) {
        if (currentReveal.blockNumber != blockNumber) {
            revert RevealedValueNotAvailable();
        }

        return currentReveal.value;
    }
}
