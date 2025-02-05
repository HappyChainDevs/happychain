// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../core/HappyTx.sol";

// [LOGGAS] import {console} from "forge-std/Script.sol";
/* [LOGDEBUG] */ import {console} from "forge-std/Script.sol";

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
                happyTx.nonceTrack,
                happyTx.nonceValue,
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

    /**
     * @notice Encodes a HappyTx struct into a compact bytes array, for minimal memory usage.
     * The encoding is done by packing fields end-to-end without 32-byte word alignment, making it
     * more gas efficient than standard ABI encoding. Dynamic fields are prefixed with their lengths
     * as uint32.
     * 
     * Encoding Format:
     * ┌─────────────────────────────────────────────────────────────┐
     * │                       Fixed Size Fields                     │
     * ├──────────┬──────┬──────┬──────────┬──────────┬──────────────┤
     * │ account  │ gas  │ exec │  dest    │paymaster │    value     │
     * │ (20b)    │ (4b) │ (4b) │  (20b)   │  (20b)   │    (32b)     │
     * ├──────────┴──────┴──────┴──────────┴──────────┴──────────────┤
     * │                  More Fixed Size Fields                     │
     * ├──────────┬──────┬───────────────┬───────────────┐           │
     * │nonceTrack│nonce │  maxFeePerGas │ submitterFee  │           │
     * │  (24b)   │ (8b) │     (32b)     │    (32b)      │           │
     * ├──────────┴──────┴───────────────┴───────────────┘           │
     * │                     Dynamic Fields                          │
     * ├─────┬─────────┬─────┬────────────┬─────┬──────────┬─────┬───┤
     * │len  │callData │len  │paymaster   │len  │validator │len  │ext│
     * │(4b) │  (Nb)   │(4b) │Data (Nb)   │(4b) │Data (Nb) │(4b) │(N)│
     * └─────┴─────────┴─────┴────────────┴─────┴──────────┴─────┴───┘
     * 
     * @param happyTx The transaction to encode
     * @return result The encoded transaction bytes
     */
    function encode(HappyTx memory happyTx) internal pure returns (bytes memory result) {
        // Fixed size fields: 20 + 4 + 4 + 20 + 20 + 32 + 24 + 8 + 32 + 32 = 196 bytes
        // Dynamic fields: 4 bytes length + actual length for each dynamic field
        // Calculate total size needed for the encoded bytes
        uint256 totalSize = 196 +
            (4 + happyTx.callData.length) +
            (4 + happyTx.paymasterData.length) +
            (4 + happyTx.validatorData.length) +
            (4 + happyTx.extraData.length);

        /* [LOGDEBUG] */ bytes32 slotAccount;
        /* [LOGDEBUG] */ bytes32 slotNonceTrack;
        /* [LOGDEBUG] */ bytes32 slotNonceValue;
        /* [LOGDEBUG] */ bytes32 slotGasLimit;
        /* [LOGDEBUG] */ bytes32 slotExecuteGasLimit;
        /* [LOGDEBUG] */ bytes32 slotDest;
        /* [LOGDEBUG] */ bytes32 slotPaymaster;
        /* [LOGDEBUG] */ bytes32 slotValue;
        /* [LOGDEBUG] */ bytes32 slotMaxFeePerGas;
        /* [LOGDEBUG] */ bytes32 slotSubmitterFee;
        /* [LOGDEBUG] */ bytes32 slotCallDataLen;
        /* [LOGDEBUG] */ bytes32 slotPaymasterDataLen;
        /* [LOGDEBUG] */ bytes32 slotValidatorDataLen;
        /* [LOGDEBUG] */ bytes32 slotExtraDataLen;

        assembly {
            // Allocate memory for result (add 32 bytes for the length prefix)
            result := mload(0x40)
            // Update free memory pointer
            mstore(0x40, add(result, add(totalSize, 32)))
            // Store length of the result
            mstore(result, totalSize)
            
            // Start writing after length prefix
            let ptr := add(result, 32)
            
            // Copy account (20 bytes)
            mstore(ptr, shl(96, and(mload(happyTx), 0xffffffffffffffffffffffffffffffffffffffff)))
            /* [LOGDEBUG] */ slotAccount := mload(ptr)
            ptr := add(ptr, 20)
            
            // Copy gasLimit (4 bytes)
            /* [LOGDEBUG] */ slotGasLimit := mload(add(happyTx, 0x20))
            mstore(ptr, shl(224, mload(add(happyTx, 0x20))))
            ptr := add(ptr, 4)
            
            // Copy executeGasLimit (4 bytes)
            /* [LOGDEBUG] */ slotExecuteGasLimit := mload(add(happyTx, 0x40))
            mstore(ptr, shl(224, mload(add(happyTx, 0x40))))
            ptr := add(ptr, 4)
            
            // Copy dest (20 bytes)
            /* [LOGDEBUG] */ slotDest := mload(add(happyTx, 0x60))
            mstore(ptr, shl(96, and(mload(add(happyTx, 0x60)), 0xffffffffffffffffffffffffffffffffffffffff)))
            ptr := add(ptr, 20)
            
            // Copy paymaster (20 bytes)
            /* [LOGDEBUG] */ slotPaymaster := mload(add(happyTx, 0x80))
            mstore(ptr, shl(96, and(mload(add(happyTx, 0x80)), 0xffffffffffffffffffffffffffffffffffffffff)))
            ptr := add(ptr, 20)
            
            // Copy value (32 bytes)
            /* [LOGDEBUG] */ slotValue := mload(add(happyTx, 0xa0))
            mstore(ptr, mload(add(happyTx, 0xa0)))
            ptr := add(ptr, 32)
            
            // Copy nonceTrack (24 bytes)
            /* [LOGDEBUG] */ slotNonceTrack := mload(add(happyTx, 0xc0))
            mstore(ptr, shl(64, mload(add(happyTx, 0xc0))))
            ptr := add(ptr, 24)
            
            // Copy nonceValue (8 bytes)
            /* [LOGDEBUG] */ slotNonceValue := mload(add(happyTx, 0xe0))
            mstore(ptr, shl(192, and(mload(add(happyTx, 0xe0)), 0xffffffffffffffff)))
            ptr := add(ptr, 8)
            
            // Copy maxFeePerGas (32 bytes)
            /* [LOGDEBUG] */ slotMaxFeePerGas := mload(add(happyTx, 0x100))
            mstore(ptr, mload(add(happyTx, 0x100)))
            ptr := add(ptr, 32)
            
            // Copy submitterFee (32 bytes)
            /* [LOGDEBUG] */ slotSubmitterFee := mload(add(happyTx, 0x120))
            mstore(ptr, mload(add(happyTx, 0x120)))
            ptr := add(ptr, 32)
            
            // Handle dynamic fields
            // For each dynamic field:
            // 1. Write length (4 bytes)
            // 2. Copy data using mcopy
            
            /* [LOGDEBUG] */ slotCallDataLen := mload(add(happyTx, 0x140))
            // /* [LOGDEBUG] */ slotPaymasterDataLen := add(lenOffset, 0x20)
            // /* [LOGDEBUG] */ slotValidatorDataLen := mload(add(lenOffset, 0x20))
            /* [LOGDEBUG] */ slotExtraDataLen := mload(add(happyTx, 0x1e0))

            let callDataOffset := mload(add(happyTx, 0x140))
            let pmDataOffset := mload(add(happyTx, 0x160))
            let validatorDataOffset := mload(add(happyTx, 0x180))
            let extraDataOffset := mload(add(happyTx, 0x1a0))

            // callData
            let lenOffset := sub(callDataOffset,0x80)
            let len := mload(add(happyTx, lenOffset))
            mstore(ptr, shl(224, len)) // Store length as uint32
            ptr := add(ptr, 4)
            mcopy(ptr, add(happyTx, add(lenOffset, 0x20)), len)
            ptr := add(ptr, len)

            // paymasterData
            lenOffset := sub(pmDataOffset,0x80)
            len := mload(add(happyTx, lenOffset))
            mstore(ptr, shl(224, len)) // Store length as uint32
            ptr := add(ptr, 4)
            mcopy(ptr, add(happyTx, add(lenOffset, 0x20)), len)
            ptr := add(ptr, len)

            // validatorData
            lenOffset := sub(validatorDataOffset,0x80)
            len := mload(add(happyTx, lenOffset))
            mstore(ptr, shl(224, len)) // Store length as uint32
            ptr := add(ptr, 4)   
            mcopy(ptr, add(happyTx, add(lenOffset, 0x20)), len)
            ptr := add(ptr, len)

            // extraData
            lenOffset := sub(extraDataOffset,0x80)
            len := mload(add(happyTx, lenOffset))
            mstore(ptr, shl(224, len)) // Store length as uint32
            ptr := add(ptr, 4)       
            mcopy(ptr, add(happyTx, add(lenOffset, 0x20)), len)
            ptr := add(ptr, len)
        }

        /* [LOGDEBUG] */ console.log("account slot: ");
        /* [LOGDEBUG] */ console.logBytes32(slotAccount);
        /* [LOGDEBUG] */ console.log("nonceTrack slot: ");
        /* [LOGDEBUG] */ console.logBytes32(slotNonceTrack);
        /* [LOGDEBUG] */ console.log("nonceValue slot: ");
        /* [LOGDEBUG] */ console.logBytes32(slotNonceValue);
        /* [LOGDEBUG] */ console.log("gasLimit slot: ");
        /* [LOGDEBUG] */ console.logBytes32(slotGasLimit);
        /* [LOGDEBUG] */ console.log("executeGasLimit slot: ");
        /* [LOGDEBUG] */ console.logBytes32(slotExecuteGasLimit);
        /* [LOGDEBUG] */ console.log("dest slot: ");
        /* [LOGDEBUG] */ console.logBytes32(slotDest);
        /* [LOGDEBUG] */ console.log("paymaster slot: ");
        /* [LOGDEBUG] */ console.logBytes32(slotPaymaster);
        /* [LOGDEBUG] */ console.log("value slot: ");
        /* [LOGDEBUG] */ console.logBytes32(slotValue);
        /* [LOGDEBUG] */ console.log("maxFeePerGas slot: ");
        /* [LOGDEBUG] */ console.logBytes32(slotMaxFeePerGas);
        /* [LOGDEBUG] */ console.log("submitterFee slot: ");
        /* [LOGDEBUG] */ console.logBytes32(slotSubmitterFee);
        /* [LOGDEBUG] */ console.log("callDataLen slot: ");
        /* [LOGDEBUG] */ console.logBytes32(slotCallDataLen);
        /* [LOGDEBUG] */ console.log("paymasterDataLen slot: ");
        /* [LOGDEBUG] */ console.logBytes32(slotPaymasterDataLen);
        /* [LOGDEBUG] */ console.log("validatorDataLen slot: ");
        /* [LOGDEBUG] */ console.logBytes32(slotValidatorDataLen);
        /* [LOGDEBUG] */ console.log("extraDataLen slot: ");
        /* [LOGDEBUG] */ console.logBytes32(slotExtraDataLen);
        /* [LOGDEBUG] */ console.log("encoded result: ");
        /* [LOGDEBUG] */ console.logBytes(result);
        console.logBytes(happyTx.callData);
        console.logBytes(happyTx.extraData);
    }

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
