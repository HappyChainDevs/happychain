// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../core/HappyTx.sol";

// [LOGGAS] import {console} from "forge-std/Script.sol";

library HappyTxLib {
    /// @dev Number of dynamic fields in HappyTx.
    uint256 private constant NUM_DYNAMIC_FIELDS = 4;
    /// @dev Number of bits used to store the length of any dynamic field in HappyTx.
    uint256 private constant DYNAMIC_FIELD_LENGTH_BITS = 40;
    /// @dev Number of bits used to store the total lengh of dynamic fields in HappyTx.
    uint256 private constant TOTAL_LENGTH_FIELD_BITS = 32;
    /// @dev Mask for dynamic field length (2^40 - 1)
    uint256 private constant MASK_DYNAMIC_FIELD_LENGTH = (1 << DYNAMIC_FIELD_LENGTH_BITS) - 1;
    /// @dev Mask for total length (2^40 - 1)
    uint256 private constant MASK_TOTAL_LENGTH_FIELD = (1 << TOTAL_LENGTH_FIELD_BITS) - 1;
    /// @dev Maximum length for dynamic fields (2^40 - 1)
    uint256 private constant MAX_DYNAMIC_FIELD_LENGTH = type(uint40).max;
    /// @dev 192 bytes for static fields, 32 bytes for dynamic fields
    uint256 private constant DYNAMIC_FIELDS_OFFSET = 224;

    /*
    * Selector returned by {@link decodeHappyTx} when unable to properly decode a happyTx.
    */
    error MalformedHappyTx();

    /**
     * @notice Computes the hash of a HappyTx for signature verification.
     * @param happyTx The transaction to hash
     * @return The abi encoded hash of the transaction
     */
    function getHappyTxHash(HappyTx memory happyTx) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                happyTx.account,
                happyTx.nonce,
                keccak256(happyTx.callData),
                happyTx.gasLimit,
                happyTx.executeGasLimit,
                happyTx.dest,
                happyTx.paymaster,
                happyTx.value,
                happyTx.maxFeePerGas,
                happyTx.submitterFee,
                keccak256(happyTx.paymasterData),
                keccak256(happyTx.validatorData)
            )
        );
    }

    // TODO: Update to new encoding discussed in call
    /**
     * @notice Encodes a HappyTx struct into a bytes array, packed end-to-end.
     * @param happyTx The transaction to encode
     * @return result The encoded transaction
     */
    function encode(HappyTx memory happyTx) internal pure returns (bytes memory result) {}

    // TODO: Update to new encoding discussed in call
    /**
     * @dev Decodes the end-to-end encoded happyTx.
     * @param happyTx The encoded happyTx bytes
     * @return result The decoded HappyTx struct
     */
    function decode(bytes calldata happyTx) public pure returns (HappyTx memory result) {
        // First validate minimum length (192 static + 32 encoded dynamic lengths = 224 bytes)
        if (happyTx.length < DYNAMIC_FIELDS_OFFSET) revert MalformedHappyTx();

        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Get pointer to the calldata bytes (don't skip 32 bytes as this is calldata not memory)
            let ptr := happyTx.offset

            // First slot: account (20) + first 12 bytes of dest
            let slot1 := calldataload(ptr)

            let account := shr(96, slot1)
            mstore(result, account) // account at 0x00

            // Get first 12 bytes of dest by bit masking
            let destFirst12 := shl(64, and(slot1, 0x0000000000000000000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF))

            // Second slot: paymaster (20) + last 8 bytes of dest + gasLimit (4)
            let slot2 := calldataload(add(ptr, 32))

            let paymaster := shr(96, slot2)
            mstore(add(result, 0x80), paymaster) // paymaster at 0x80

            // Get last 8 bytes of dest
            let destLast8 := shr(32, and(slot2, 0x0000000000000000000000000000000000000000FFFFFFFFFFFFFFFF00000000))

            // Combine dest parts
            let dest := or(destFirst12, destLast8)
            mstore(add(result, 0x60), dest) // dest at 0x60

            // Store gasLimit
            let gasLimit := and(slot2, 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF)
            mstore(add(result, 0x20), gasLimit)

            // Load remaining static fields
            let value := calldataload(add(ptr, 64))
            mstore(add(result, 0xA0), value)

            let nonce := calldataload(add(ptr, 96))
            mstore(add(result, 0xC0), nonce)

            let maxFeePerGas := calldataload(add(ptr, 128))
            mstore(add(result, 0xE0), maxFeePerGas)

            let submitterFee := calldataload(add(ptr, 160))
            mstore(add(result, 0x100), submitterFee)
        }

        (
            uint256 totalLength,
            uint256 callDataLength,
            uint256 paymasterDataLength,
            uint256 validatorDataLength,
            uint256 extraDataLength,
            uint32 executeGasLimit
        ) = _unpackLengths(bytes32(happyTx[192:224]));

        // Validate total length matches calldata
        if (happyTx.length != DYNAMIC_FIELDS_OFFSET + totalLength) revert MalformedHappyTx();

        result.executeGasLimit = executeGasLimit;

        uint256 dynamicOffset = DYNAMIC_FIELDS_OFFSET;

        result.callData = happyTx[dynamicOffset:dynamicOffset + callDataLength];
        if (result.callData.length != callDataLength) revert MalformedHappyTx();
        dynamicOffset += callDataLength;

        result.paymasterData = happyTx[dynamicOffset:dynamicOffset + paymasterDataLength];
        if (result.paymasterData.length != paymasterDataLength) revert MalformedHappyTx();
        dynamicOffset += paymasterDataLength;

        result.validatorData = happyTx[dynamicOffset:dynamicOffset + validatorDataLength];
        if (result.validatorData.length != validatorDataLength) revert MalformedHappyTx();
        dynamicOffset += validatorDataLength;

        result.extraData = happyTx[dynamicOffset:dynamicOffset + extraDataLength];
        if (result.extraData.length != extraDataLength) revert MalformedHappyTx();

        // [LOGGAS] console.log("\n=== HappyTxLib.decode() ===\n");
        // [LOGGAS] console.log(" - account:", result.account);
        // [LOGGAS] console.log(" - dest:", result.dest);
        // [LOGGAS] console.log(" - paymaster:", result.paymaster);
        // [LOGGAS] console.log(" - gasLimit:", result.gasLimit);
        // [LOGGAS] console.log(" - executeGasLimit:", result.executeGasLimit);
        // [LOGGAS] console.log(" - value:", result.value);
        // [LOGGAS] console.log(" - nonce:", result.nonce);
        // [LOGGAS] console.log(" - maxFeePerGas:", result.maxFeePerGas);
        // [LOGGAS] console.log(" - submitterFee:", result.submitterFee);
        // [LOGGAS] console.logBytes(result.callData);
        // [LOGGAS] console.logBytes(result.paymasterData);
        // [LOGGAS] console.logBytes(result.validatorData);
        // [LOGGAS] console.logBytes(result.extraData);
        // [LOGGAS] console.log("\n=== HappyTxLib.decode() ===\n");
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL VIEW/PURE HELPERS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Returns an overestimation of the gas consumed by a transaction
     * @param callGas The gas consumed by the function call
     * @param calldataLength The length of the calldata
     * @return The estimated total gas consumption including:
     *         - 21000 fixed intrinsic gas
     *         - Calldata gas cost assuming all non-zero bytes
     *         - callGas
     *         - Function dispatch overhead (TODO)
     */
    function txGasFromCallGas(uint256 callGas, uint256 calldataLength) internal pure returns (uint256) {
        return 21000 + (200 + calldataLength) * 16 + callGas; // + TODO;

        // - `(200 + calldataLength) * 16` is an overestimate of the calldata part of the
        //    intrinsic gas obtained by assuming every byte is non-zero in the tx data.
        //     - A transaction without calldata and access list is at most ~280 bytes
        //       but due to RLP encoding this should be lower. 200 is a good compromise,
        //       essentially since we already overcharge for the bytes whose value is 0.
    }

    /**
     * @dev Utility function to unpack dynamic field lengths from a single word.
     * Layout (32 bytes total):
     * |-totalLen(8)-|-dynamicLengths(20)-|-execGasLimit(4)-|
     * Most significant bits (left) to least significant bits (right)
     * @param encodedLengths Packed lengths in a single bytes32
     * @return totalLength Total length of all dynamic fields combined
     * @return callDataLength Length of callData field
     * @return paymasterDataLength Length of paymasterData field
     * @return validatorDataLength Length of validatorData field
     * @return extraDataLength Length of extraData field
     * @return execGasLimit Gas limit for execute function
     */
    function _unpackLengths(bytes32 encodedLengths)
        internal
        pure
        returns (
            uint256 totalLength,
            uint256 callDataLength,
            uint256 paymasterDataLength,
            uint256 validatorDataLength,
            uint256 extraDataLength,
            uint32 execGasLimit
        )
    {
        unchecked {
            uint256 encoded = uint256(encodedLengths);
            totalLength = encoded >> 192;
            callDataLength = (encoded >> 152) & MASK_DYNAMIC_FIELD_LENGTH;
            paymasterDataLength = (encoded >> 112) & MASK_DYNAMIC_FIELD_LENGTH;
            validatorDataLength = (encoded >> 72) & MASK_DYNAMIC_FIELD_LENGTH;
            extraDataLength = (encoded >> 32) & MASK_DYNAMIC_FIELD_LENGTH;
            execGasLimit = uint32(encoded & MASK_TOTAL_LENGTH_FIELD);

            // Validate all lengths are within 40 bits
            uint256 maxLengthValue = callDataLength | paymasterDataLength | validatorDataLength | extraDataLength;
            if (maxLengthValue > MAX_DYNAMIC_FIELD_LENGTH) revert MalformedHappyTx();

            // Validate total length matches sum of individual lengths
            if (totalLength != callDataLength + paymasterDataLength + validatorDataLength + extraDataLength) {
                revert MalformedHappyTx();
            }
        }
    }
}
