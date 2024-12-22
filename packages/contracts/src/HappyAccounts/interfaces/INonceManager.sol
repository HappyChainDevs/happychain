// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

/**
 * @title INonceManager
 * @dev Manages nonces for a HappyAccount with support for parallel execution tracks
 */
interface INonceManager {
    /**
     * @dev Emitted when a nonce is used in a track
     * @param track The track number
     * @param nonce The nonce that was used
     */
    event NonceUsed(uint64 indexed track, uint64 nonce);

    /**
     * @dev Returns the next valid nonce for a given track
     * @param track The track number to query
     * @return The next valid nonce
     */
    function getNonce(uint64 track) external view returns (uint64);

    /**
     * @dev Allows incrementing nonce in a track
     * Useful during account initialization to absorb first-time gas costs
     * @param track The track to increment nonce for
     */
    function incrementNonce(uint64 track) external;
}
