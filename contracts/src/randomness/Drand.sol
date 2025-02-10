// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {BLS} from "bls-bn254/BLS.sol";

contract Drand {
    bytes public constant DST = bytes("BLS_SIG_BN254G1_XMD:KECCAK-256_SVDW_RO_NUL_");

<<<<<<< HEAD
    uint256 public immutable DRAND_PK_0;
    uint256 public immutable DRAND_PK_1;
    uint256 public immutable DRAND_PK_2;
    uint256 public immutable DRAND_PK_3;
=======
    uint256 public immutable drandPK0;
    uint256 public immutable drandPK1;
    uint256 public immutable drandPK2;
    uint256 public immutable drandPK3;
>>>>>>> 816a813a (chore(randomness): move drand pub key to their elements)
    uint256 public immutable DRAND_GENESIS_TIMESTAMP_SECONDS;
    uint256 public immutable DRAND_PERIOD_SECONDS;
    mapping(uint64 round => bytes32 randomness) public drandRandomness;

    event DrandRandomnessPosted(uint64 indexed round, bytes32 randomness);

    error InvalidPublicKey(uint256[4] publicKey);
    error InvalidSignature(uint256[4] publicKey, uint256[2] message, uint256[2] signature);
    error DrandNotAvailable(uint64 round);

    constructor(uint256[4] memory _drandPublicKey, uint256 _drandGenesisTimestampSeconds, uint256 _drandPeriodSeconds) {
        if (!BLS.isValidPublicKey(_drandPublicKey)) {
            revert InvalidPublicKey(_drandPublicKey);
        }
<<<<<<< HEAD
        DRAND_PK_0 = _drandPublicKey[0];
        DRAND_PK_1 = _drandPublicKey[1];
        DRAND_PK_2 = _drandPublicKey[2];
        DRAND_PK_3 = _drandPublicKey[3];
=======
        drandPK0 = _drandPublicKey[0];
        drandPK1 = _drandPublicKey[1];
        drandPK2 = _drandPublicKey[2];
        drandPK3 = _drandPublicKey[3];
>>>>>>> 816a813a (chore(randomness): move drand pub key to their elements)
        DRAND_GENESIS_TIMESTAMP_SECONDS = _drandGenesisTimestampSeconds;
        DRAND_PERIOD_SECONDS = _drandPeriodSeconds;
    }

    /**
     * @notice Posts a new Drand signature for a given drand round.
     */
    function postDrand(uint64 round, uint256[2] memory signature) external {
        // Encode round for hash-to-point
        bytes memory hashedRoundBytes = new bytes(32);

        // hashedRoundBytes = keccak256(abi.encodePacked(round)) — not valid solidity syntax
        assembly {
            mstore(0x00, round)
            let hashedRound := keccak256(0x18, 0x08) // hash the last 8 bytes (uint64) of `round`
            mstore(add(0x20, hashedRoundBytes), hashedRound)
        }
        uint256[2] memory message = BLS.hashToPoint(DST, hashedRoundBytes);

        // NB: Always check that the signature is a valid signature (a valid G1 point on the curve)!
        if (!BLS.isValidSignature(signature)) {
            revert InvalidSignature([DRAND_PK_0, DRAND_PK_1, DRAND_PK_2, DRAND_PK_3], message, signature);
        }

        // Verify the signature over the message using the public key
        (bool pairingSuccess, bool callSuccess) =
            BLS.verifySingle(signature, [DRAND_PK_0, DRAND_PK_1, DRAND_PK_2, DRAND_PK_3], message);
        if (!pairingSuccess || !callSuccess) {
            revert InvalidSignature([DRAND_PK_0, DRAND_PK_1, DRAND_PK_2, DRAND_PK_3], message, signature);
        }
        bytes32 roundRandomness = keccak256(abi.encode(signature));

        drandRandomness[round] = roundRandomness;
        emit DrandRandomnessPosted(round, roundRandomness);
    }

    /**
     * @notice Retrieves the randomness value for a specific drand round.
     * This function does not revert if the randomness value is not available. Instead, it returns 0.
     */
    function unsafeGetDrand(uint64 round) public view returns (bytes32) {
        return drandRandomness[round];
    }

    /**
     * @notice Retrieves the randomness value for a specific drand round.
     * This function reverts if the randomness value is not available.
     */
    function getDrand(uint64 round) public view returns (bytes32) {
        if (drandRandomness[round] == 0) {
            revert DrandNotAvailable(round);
        }

        return drandRandomness[round];
    }

    /**
     * @notice Returns the latest drand value at the given timestamp.
     */
    function _getDrandAtTimestamp(uint256 timestamp) internal view returns (bytes32) {
        uint64 round = uint64((timestamp - DRAND_GENESIS_TIMESTAMP_SECONDS) / DRAND_PERIOD_SECONDS) + 1;
        return getDrand(round);
    }

    /**
     * @notice Returns the timestamp in which a new drand value will be available after the given timestamp.
     */
    function _nextValidDrandTimestamp(uint256 timestamp) internal view returns (uint256) {
        return timestamp + (DRAND_PERIOD_SECONDS - (timestamp % DRAND_PERIOD_SECONDS));
    }
}
