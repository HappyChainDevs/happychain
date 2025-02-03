// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

/**
 * @title BasicNonceManager
 * @dev   Contract implementing simple nonce management for a HappyAccount
 */
contract BasicNonceManager {
    event NonceUsed(uint256 indexed nonce);

    uint256 internal _nonce;

    function getNonce() external view returns (uint256) {
        return _nonce;
    }

    /**
     * Validates and updates the nonce
     * @param nonceAhead The difference between current nonce and happyTx.nonce
     * @param isSimulation Wether the current transaction is a simulation (tx.origin == address(0))
     * @return status The validation status of the nonce
     */
    function _validateAndUpdateNonce(int256 nonceAhead, bool isSimulation) internal returns (bool) {
        if (nonceAhead < 0 || (!isSimulation && nonceAhead != 0)) {
            return false;
        }

        emit NonceUsed(_nonce++);
        return true;
    }
}
