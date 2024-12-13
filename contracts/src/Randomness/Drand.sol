// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {BLS} from "bls-bn254/BLS.sol";

contract Drand {
    bytes public constant DST = bytes("BLS_SIG_BN254G1_XMD:KECCAK-256_SVDW_RO_NUL_");

    uint256[4] public publicKey;
    uint256 public genesisTimestamp;
    uint256 public period;
    mapping(uint64 round => bytes32 randomness) public randomness;

    error InvalidPublicKey(uint256[4] publicKey);
    error InvalidSignature(uint256[4] publicKey, uint256[2] message, uint256[2] signature);
    error DrandNotAvailable(uint64 round);

    constructor(uint256[4] memory _publicKey, uint256 _genesisTimestamp, uint256 _period) {
        if (!BLS.isValidPublicKey(_publicKey)) {
            revert InvalidPublicKey(_publicKey);
        }
        publicKey = _publicKey;
        genesisTimestamp = _genesisTimestamp;
        period = _period;
    }

    function postDrand(uint64 round, uint256[2] memory signature) external {
        // Encode round for hash-to-point
        bytes memory hashedRoundBytes = new bytes(32);
        assembly {
            mstore(0x00, round)
            let hashedRound := keccak256(0x18, 0x08) // hash the last 8 bytes (uint64) of `round`
            mstore(add(0x20, hashedRoundBytes), hashedRound)
        }
        uint256[2] memory message = BLS.hashToPoint(DST, hashedRoundBytes);

        // NB: Always check that the signature is a valid signature (a valid G1 point on the curve)!
        bool isValidSignature = BLS.isValidSignature(signature);
        if (!isValidSignature) {
            revert InvalidSignature(publicKey, message, signature);
        }

        // Verify the signature over the message using the public key
        (bool pairingSuccess, bool callSuccess) = BLS.verifySingle(signature, publicKey, message);
        if (!pairingSuccess) {
            revert InvalidSignature(publicKey, message, signature);
        }

        bytes32 roundRandomness = keccak256(abi.encode(signature));

        randomness[round] = roundRandomness;
    }

    function _unsafeGetDrand(uint64 round) internal view returns (bytes32) {
        return randomness[round];
    }

    function _getDrand(uint64 round) internal view returns (bytes32) {
        if (randomness[round] == 0) {
            revert DrandNotAvailable(round);
        }

        return randomness[round];
    }

    function _getDrandAtTimestamp(uint256 timestamp) internal view returns (bytes32) {
        uint64 round = uint64((timestamp - genesisTimestamp) / period);
        return _getDrand(round);
    }

    function _nextValidTimestamp(uint256 timestamp) internal view returns (uint256) {
        return timestamp + (period - (timestamp % period));
    }
}
