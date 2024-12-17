// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {BLS} from "bls-bn254/BLS.sol";

contract Drand {
    bytes public constant DST = bytes("BLS_SIG_BN254G1_XMD:KECCAK-256_SVDW_RO_NUL_");

    uint256[4] public drandPublicKey;
    uint256 public drandGenesisTimestamp;
    uint256 public drandPeriod;
    mapping(uint64 round => bytes32 randomness) public drandRandomness;

    event DrandRandomnessPosted(uint64 indexed round, bytes32 randomness);

    error InvalidPublicKey(uint256[4] publicKey);
    error InvalidSignature(uint256[4] publicKey, uint256[2] message, uint256[2] signature);
    error DrandNotAvailable(uint64 round);

    constructor(uint256[4] memory _drandPublicKey, uint256 _drandGenesisTimestamp, uint256 _drandPeriod) {
        if (!BLS.isValidPublicKey(_drandPublicKey)) {
            revert InvalidPublicKey(_drandPublicKey);
        }
        drandPublicKey = _drandPublicKey;
        drandGenesisTimestamp = _drandGenesisTimestamp;
        drandPeriod = _drandPeriod;
    }

    /**
     * @notice Posts a new Drand signature for a given drand round.
     * @dev This function is used to submit a new signature for a specific drand round.
     * @param round The drand round number
     * @param signature The signature of the drand round
     */
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
            revert InvalidSignature(drandPublicKey, message, signature);
        }

        // Verify the signature over the message using the public key
        (bool pairingSuccess, bool callSuccess) = BLS.verifySingle(signature, drandPublicKey, message);
        if (!pairingSuccess) {
            revert InvalidSignature(drandPublicKey, message, signature);
        }

        bytes32 roundRandomness = keccak256(abi.encode(signature));

        drandRandomness[round] = roundRandomness;
        emit DrandRandomnessPosted(round, roundRandomness);
    }

    /**
     * @notice Retrieves the randomness value for a specific drand round.
     * @dev This function does not revert if the randomness value is not available. Instead, it returns 0.
     * @param round The drand round number
     * @return randomness The randomness value for the specified drand round, or 0
     * if the randomness value is not available.
     */
    function unsafeGetDrand(uint64 round) public view returns (bytes32) {
        return drandRandomness[round];
    }

    /**
     * @notice Retrieves the randomness value for a specific drand round.
     * @dev This function reverts if the randomness value is not available.
     * @param round The drand round number
     * @return randomness The randomness value for the specified drand round.
     */
    function getDrand(uint64 round) public view returns (bytes32) {
        if (drandRandomness[round] == 0) {
            revert DrandNotAvailable(round);
        }

        return drandRandomness[round];
    }

    function _getDrandAtTimestamp(uint256 timestamp) internal view returns (bytes32) {
        uint64 round = uint64((timestamp - drandGenesisTimestamp) / drandPeriod);
        return getDrand(round);
    }

    function _nextValidTimestamp(uint256 timestamp) internal view returns (uint256) {
        return timestamp + (drandPeriod - (timestamp % drandPeriod));
    }
}
