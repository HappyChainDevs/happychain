// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import "./interfaces/INonceManager.sol";

/**
 * @title NonceManager
 * @dev Abstract contract implementing nonce management for a HappyAccount
 */
abstract contract NonceManager is INonceManager {
    /// @dev Mapping from track => nonce
    mapping(uint64 => uint64) private _nonces;

    /// @inheritdoc INonceManager
    function getNonce(uint64 track) public view override returns (uint64) {
        return _nonces[track];
    }

    /// @inheritdoc INonceManager
    function incrementNonce(uint64 track) external override {
        _nonces[track]++;
        emit NonceUsed(track, _nonces[track]);
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
