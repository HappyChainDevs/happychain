// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {CallInfo} from "../../interfaces/extensions/IExtensibleBoopAccount.sol";

library CallInfoCoding {
    function decodeCallInfo(bytes memory data) internal pure returns (bool success, CallInfo memory info) {
        return decodeCallInfo(data, 0);
    }

    /**
     * Decodes a CallInfo encoded in `data` at offset `start`, and tightly packed (dest on 20 bytes,
     * value on 32 bytes, callData.length on 32 bytes, followed by the calldata, taking exactly
     * callData.length bytes).
     */
    function decodeCallInfo(bytes memory data, uint256 start)
        internal
        pure
        returns (bool success, CallInfo memory info)
    {
        if (start + 84 > data.length) {
            return (false, info); // not enough data (dest, value, callData length)
        }

        assembly {
            let infoDest := info
            let infoValue := add(info, 32)
            let infocallDataPointer := add(info, 64)

            let offset := add(add(data, 32), start)

            mstore(infoDest, 0) // clear out destination memory
            mcopy(infoDest, offset, 20)
            offset := add(offset, 20)

            mcopy(infoValue, offset, 32)
            offset := add(offset, 32)

            let callDataLength := mload(offset)
            offset := add(offset, 32)

            let dataLength := mload(data)
            let requiredLength := add(add(start, 84), callDataLength)
            success := gt(dataLength, requiredLength)

            if success {
                // copy length + calldata to free memory
                let memptr := mload(0x40) // free memory pointer
                let callDataPointer := memptr // save pointer
                mstore(memptr, callDataLength) // store length
                memptr := add(memptr, 32)
                mcopy(memptr, offset, callDataLength) // copy calldata
                memptr := add(memptr, callDataLength)

                // update free memory pointer with proper alignment (nearest 32 multiple)
                mstore(0x40, and(add(memptr, 31), not(31)))

                // store pointer to bytes in the struct
                mstore(infocallDataPointer, callDataPointer)
            }
        }

        return (success, info);
    }

    function decodeCallInfoArray(bytes memory data) internal pure returns (bool success, CallInfo[] memory calls) {
        return decodeCallInfoArray(data, 0);
    }

    function decodeCallInfoArray(bytes memory data, uint256 start)
        internal
        pure
        returns (bool success, CallInfo[] memory calls)
    {
        if (start + 32 > data.length) {
            return (false, calls); // length not present
        }

        uint256 length;
        assembly {
            length := mload(add(data, start))
        }

        success = true;
        calls = new CallInfo[](length);

        uint256 offset = start + 32;
        for (uint256 i = 0; i < length; ++i) {
            CallInfo memory call;
            (success, call) = decodeCallInfo(data, offset);
            if (!success) return (success, calls);
            offset += 84 + call.callData.length;
            calls[i] = call;
        }
    }
}
