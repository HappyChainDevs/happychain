// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

/**
 * @title ParallelNonceManager
 * @dev   Contract implementing parallel nonce management for a HappyAccount
 */
contract ParallelNonceManager {
    /**
     * @dev Emitted when a nonce is used in a track
     * @param track The track number
     * @param nonce The nonce that was used
     */
    event NonceUsed(uint64 indexed track, uint64 nonce);

    /// @dev Mapping from track => nonce
    mapping(uint64 => uint64) private _nonces;

    function getNonce(uint64 track) public view returns (uint64) {
        return _nonces[track];
    }

    /**
     * @dev Internal function to validate and update nonce
     * @param track The track number
     * @param nonce The nonce to validate
     * @return true if nonce was valid and updated
     */
    function _validateAndUpdateNonce(uint64 track, uint64 nonce) internal returns (bool) {
        if (_nonces[track] != nonce) {
            return false;
        }

        _nonces[track]++;
        emit NonceUsed(track, nonce);
        return true;
    }
}
