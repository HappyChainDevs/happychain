// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {console} from "forge-std/Script.sol";
/**
 * @title BasicNonceManager
 * @dev   Contract implementing simple nonce management for a HappyAccount
 */

contract BasicNonceManager {
    /**
     * @dev Emitted when a nonce is used in a track
     * @param nonceTrack The nonce Track used
     * @param nonceValue The corresponsind nonce value
     */
    event NonceUsed(uint192 indexed nonceTrack, uint64 indexed nonceValue);

    /// @dev Mapping from track => nonce
    mapping(uint192 => uint64) private nonceValue;

    function getNonce(uint192 nonceTrack) public view returns (uint256 nonce) {
        return nonceValue[nonceTrack] | (uint256(nonceTrack) << 64);
    }

    /**
     * Validates and updates the nonce
     * @param nonceAhead The difference between current nonce and happyTx.nonce
     * @param nonceTrack The nonce track for the current transaction
     * @param isSimulation Indicates whether the current transaction is a simulation
     * @return Whether the nonce was validated and updated succesfully
     */
    function _validateAndUpdateNonce(int256 nonceAhead, uint192 nonceTrack, bool isSimulation)
        internal
        returns (bool)
    {
        if (nonceAhead < 0 || (!isSimulation && nonceAhead != 0)) {
            return false;
        }

        emit NonceUsed(nonceTrack, nonceValue[nonceTrack]);
        nonceValue[nonceTrack]++;

        return true;
    }
}
