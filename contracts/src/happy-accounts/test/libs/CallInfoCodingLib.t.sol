// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CallInfo, CallInfoCodingLib} from "boop/libs/CallInfoCodingLib.sol";

contract CallInfoCodingLibTest is Test {
    using CallInfoCodingLib for bytes;

    address private mockDest = address(0x1234567890123456789012345678901234567890);
    uint256 private mockValue = 42 ether;

    // ====================================================================================================
    // TESTS FOR {CallInfoCodingLib.decodeCallInfoArray}

    function testEncodeCallInfoArrayEmpty() public pure {
        bytes memory data = new bytes(0);
        CallInfo[] memory calls = new CallInfo[](0);
        (bool success, CallInfo[] memory decodedCalls) = data.decodeCallInfoArray();
        assertEq(success, false);
        assertEq(calls.length, decodedCalls.length);
        for (uint256 i = 0; i < calls.length; ++i) {
            assertEq(calls[i].dest, decodedCalls[i].dest);
            assertEq(calls[i].value, decodedCalls[i].value);
            assertEq(calls[i].callData, decodedCalls[i].callData);
        }
    }

    function testEncodeDecodeCallInfoArraySingleCallInfo() public view {
        // Create a single CallInfo
        bytes memory testCallData = abi.encodeWithSignature("transfer(address,uint256)", address(0xBEEF), 100);
        CallInfo[] memory calls = new CallInfo[](1);
        calls[0] = CallInfo({dest: mockDest, value: mockValue, callData: testCallData});

        // Encode using our helper function
        bytes memory encoded = encodeCallInfoArray(calls);

        // Decode and verify
        (bool success, CallInfo[] memory decodedCalls) = encoded.decodeCallInfoArray();

        assertEq(success, true);
        assertEq(decodedCalls.length, calls.length);
        assertEq(decodedCalls[0].dest, calls[0].dest);
        assertEq(decodedCalls[0].value, calls[0].value);
        assertEq(keccak256(decodedCalls[0].callData), keccak256(calls[0].callData));
    }

    function testEncodeDecodeCallInfoArrayMultipleCallInfos() public view {
        // Create multiple CallInfos with different properties
        CallInfo[] memory calls = new CallInfo[](3);

        // First call - standard transfer
        calls[0] = CallInfo({
            dest: mockDest,
            value: mockValue,
            callData: abi.encodeWithSignature("transfer(address,uint256)", address(0x1111), 100)
        });

        // Second call - empty callData
        calls[1] = CallInfo({dest: mockDest, value: mockValue, callData: new bytes(0)});

        // Third call - complex callData
        calls[2] = CallInfo({
            dest: mockDest,
            value: 0,
            callData: abi.encodeWithSignature(
                "complexFunction(uint256[],address[],bytes)", new uint256[](3), new address[](2), abi.encode("nested data")
            )
        });

        // Encode using our helper function
        bytes memory encoded = encodeCallInfoArray(calls);

        // Decode and verify
        (bool success, CallInfo[] memory decodedCalls) = encoded.decodeCallInfoArray();

        assertEq(success, true);
        assertEq(decodedCalls.length, calls.length);

        // Verify each call was encoded/decoded correctly
        for (uint256 i = 0; i < calls.length; i++) {
            assertEq(decodedCalls[i].dest, calls[i].dest);
            assertEq(decodedCalls[i].value, calls[i].value);
            assertEq(keccak256(decodedCalls[i].callData), keccak256(calls[i].callData));
        }
    }

    function testEncodeDecodeCallInfoArrayWithOffset() public view {
        // Create CallInfo array
        CallInfo[] memory calls = new CallInfo[](2);
        calls[0] =
            CallInfo({dest: mockDest, value: mockValue, callData: abi.encodeWithSignature("methodA(uint256)", 123)});
        calls[1] =
            CallInfo({dest: mockDest, value: mockValue, callData: abi.encodeWithSignature("methodB(bool)", true)});

        // Add prefix to test offset
        bytes memory prefix = abi.encode("prefix data");
        uint256 offset = prefix.length;

        // Encode the CallInfo array
        bytes memory encodedCalls = encodeCallInfoArray(calls);

        // Create a new buffer with prefix + encoded calls
        bytes memory data = new bytes(offset + encodedCalls.length);

        // Copy prefix
        assembly {
            let destPtr := add(data, 32) // Skip length word
            let srcPtr := add(prefix, 32) // Skip length word
            let len := mload(prefix)

            for { let i := 0 } lt(i, len) { i := add(i, 32) } {
                let chunk := mload(add(srcPtr, i))
                mstore(add(destPtr, i), chunk)

                if gt(add(i, 32), len) {
                    let remaining := sub(len, i)
                    mstore(add(add(destPtr, i), remaining), 0)
                }
            }
        }

        // Copy encoded calls
        assembly {
            let destPtr := add(add(data, 32), offset) // Skip length word + prefix
            let srcPtr := add(encodedCalls, 32) // Skip length word
            let len := mload(encodedCalls)

            for { let i := 0 } lt(i, len) { i := add(i, 32) } {
                let chunk := mload(add(srcPtr, i))
                mstore(add(destPtr, i), chunk)

                if gt(add(i, 32), len) {
                    let remaining := sub(len, i)
                    mstore(add(add(destPtr, i), remaining), 0)
                }
            }
        }

        // Decode with offset and verify
        (bool success, CallInfo[] memory decodedCalls) = data.decodeCallInfoArray(offset);

        assertEq(success, true, "Decoding with offset should succeed");
        assertEq(decodedCalls.length, calls.length, "Array length mismatch with offset");

        // Verify each call was decoded correctly
        for (uint256 i = 0; i < calls.length; i++) {
            assertEq(
                decodedCalls[i].dest,
                calls[i].dest,
                string.concat("Destination address mismatch with offset for call ", vm.toString(i))
            );
            assertEq(
                decodedCalls[i].value,
                calls[i].value,
                string.concat("Value mismatch with offset for call ", vm.toString(i))
            );
            assertEq(
                keccak256(decodedCalls[i].callData),
                keccak256(calls[i].callData),
                string.concat("CallData mismatch with offset for call ", vm.toString(i))
            );
        }
    }

    // ====================================================================================================
    // TESTS FOR {CallInfoCodingLib.decodeCallInfo}

    function testDecodeCallInfoEmpty() public pure {
        bytes memory data = new bytes(0);
        CallInfo memory info = CallInfo({dest: address(0), value: 0, callData: new bytes(0)});
        (bool success, CallInfo memory decodedInfo) = data.decodeCallInfo();
        assertEq(success, false);
        assertEq(info.dest, decodedInfo.dest);
        assertEq(info.value, decodedInfo.value);
        assertEq(info.callData, decodedInfo.callData);
    }

    function testDecodeCallInfoValidBasic() public pure {
        // Create a simple CallInfo
        address testDest = address(0x1234567890123456789012345678901234567890);
        uint256 testValue = 123 ether;
        bytes memory testCallData = abi.encodeWithSignature("transfer(address,uint256)", address(0xBEEF), 42);

        // Manually encode it according to the format
        bytes memory encoded = new bytes(84 + testCallData.length);

        // Copy destination address (20 bytes)
        assembly {
            // Skip the length word (32 bytes) and copy the address
            let ptr := add(encoded, 32)
            mstore(ptr, 0) // Clear the slot
            mstore(add(ptr, 12), testDest) // Store address with 12 bytes left padding
        }

        // Copy value (32 bytes)
        assembly {
            let ptr := add(add(encoded, 32), 20) // Skip length word + dest
            mstore(ptr, testValue)
        }

        // Copy callData length (32 bytes)
        assembly {
            let ptr := add(add(encoded, 32), 52) // Skip length word + dest + value
            mstore(ptr, mload(testCallData)) // Store callData length
        }

        // Copy callData
        assembly {
            let srcPtr := add(testCallData, 32) // Skip length word
            let destPtr := add(add(encoded, 32), 84) // Skip length word + dest + value + callData length
            let len := mload(testCallData)

            // Copy byte by byte
            for { let i := 0 } lt(i, len) { i := add(i, 32) } {
                let chunk := mload(add(srcPtr, i))
                mstore(add(destPtr, i), chunk)

                // Handle the last chunk (might be less than 32 bytes)
                if gt(add(i, 32), len) {
                    let remaining := sub(len, i)
                    // We've already copied this chunk, but we need to make sure we don't overwrite
                    // beyond the end of the callData
                    mstore(add(add(destPtr, i), remaining), 0)
                }
            }
        }

        // Decode and verify
        (bool success, CallInfo memory decodedInfo) = encoded.decodeCallInfo();

        assertEq(success, true, "Decoding should succeed");
        assertEq(decodedInfo.dest, testDest, "Destination address mismatch");
        assertEq(decodedInfo.value, testValue, "Value mismatch");
        assertEq(keccak256(decodedInfo.callData), keccak256(testCallData), "CallData mismatch");
    }

    function testDecodeCallInfoWithOffset() public view {
        // Create a simple CallInfo
        address testDest = mockDest;
        uint256 testValue = mockValue;
        bytes memory testCallData = abi.encodeWithSignature("approve(address,uint256)", address(0xDEAD), 100);

        // Add some prefix data to test offset
        bytes memory prefix = abi.encode("prefix data for testing offset");
        uint256 offset = prefix.length;

        // Manually encode with prefix
        bytes memory encoded = new bytes(offset + 84 + testCallData.length);

        // Copy prefix
        assembly {
            let destPtr := add(encoded, 32) // Skip length word
            let srcPtr := add(prefix, 32) // Skip length word
            let len := mload(prefix)

            for { let i := 0 } lt(i, len) { i := add(i, 32) } {
                let chunk := mload(add(srcPtr, i))
                mstore(add(destPtr, i), chunk)

                if gt(add(i, 32), len) {
                    let remaining := sub(len, i)
                    mstore(add(add(destPtr, i), remaining), 0)
                }
            }
        }

        // Copy destination address (20 bytes)
        assembly {
            let ptr := add(add(encoded, 32), offset) // Skip length word + prefix
            mstore(ptr, 0) // Clear the slot
            mstore(add(ptr, 12), testDest) // Store address with 12 bytes left padding
        }

        // Copy value (32 bytes)
        assembly {
            let ptr := add(add(encoded, 32), add(offset, 20)) // Skip length word + prefix + dest
            mstore(ptr, testValue)
        }

        // Copy callData length (32 bytes)
        assembly {
            let ptr := add(add(encoded, 32), add(offset, 52)) // Skip length word + prefix + dest + value
            mstore(ptr, mload(testCallData)) // Store callData length
        }

        // Copy callData
        assembly {
            let srcPtr := add(testCallData, 32) // Skip length word
            let destPtr := add(add(encoded, 32), add(offset, 84)) // Skip length word + prefix + dest + value + callData length
            let len := mload(testCallData)

            for { let i := 0 } lt(i, len) { i := add(i, 32) } {
                let chunk := mload(add(srcPtr, i))
                mstore(add(destPtr, i), chunk)

                if gt(add(i, 32), len) {
                    let remaining := sub(len, i)
                    mstore(add(add(destPtr, i), remaining), 0)
                }
            }
        }

        // Decode with offset and verify
        (bool success, CallInfo memory decodedInfo) = encoded.decodeCallInfo(offset);

        assertEq(success, true, "Decoding with offset should succeed");
        assertEq(decodedInfo.dest, testDest, "Destination address mismatch with offset");
        assertEq(decodedInfo.value, testValue, "Value mismatch with offset");
        assertEq(keccak256(decodedInfo.callData), keccak256(testCallData), "CallData mismatch with offset");
    }

    function testDecodeCallInfoEmptyCallData() public view {
        // Create a CallInfo with empty callData
        address testDest = mockDest;
        uint256 testValue = mockValue;

        // Manually encode it
        bytes memory encoded = new bytes(84); // No callData, just the fixed part

        // Copy destination address (20 bytes)
        assembly {
            let ptr := add(encoded, 32) // Skip length word
            mstore(ptr, 0) // Clear the slot
            mstore(add(ptr, 12), testDest) // Store address with 12 bytes left padding
        }

        // Copy value (32 bytes)
        assembly {
            let ptr := add(add(encoded, 32), 20) // Skip length word + dest
            mstore(ptr, testValue)
        }

        // Copy callData length (32 bytes) - zero in this case
        assembly {
            let ptr := add(add(encoded, 32), 52) // Skip length word + dest + value
            mstore(ptr, 0) // Store callData length (0)
        }

        // Decode and verify
        (bool success, CallInfo memory decodedInfo) = encoded.decodeCallInfo();

        assertEq(success, true, "Decoding with empty callData should succeed");
        assertEq(decodedInfo.dest, testDest, "Destination address mismatch with empty callData");
        assertEq(decodedInfo.value, testValue, "Value mismatch with empty callData");
        assertEq(decodedInfo.callData.length, 0, "CallData length should be 0");
    }

    function testDecodeCallInfoInvalidData() public pure {
        // Test with data that's too short
        bytes memory tooShort = new bytes(83); // Need at least 84 bytes
        (bool success, CallInfo memory decodedInfo) = tooShort.decodeCallInfo();

        assertEq(success, false, "Decoding should fail with too short data");
        assertEq(decodedInfo.dest, address(0), "Default dest should be zero address");
        assertEq(decodedInfo.value, 0, "Default value should be 0");
        assertEq(decodedInfo.callData.length, 0, "Default callData should be empty");

        // Test with data that claims to have callData but doesn't have enough bytes
        bytes memory invalidCallDataLength = new bytes(84);

        // Set callData length to a value larger than available data
        assembly {
            let ptr := add(add(invalidCallDataLength, 32), 52) // Skip length word + dest + value
            mstore(ptr, 100) // Claim callData length of 100 bytes, but we don't have that much
        }

        (success, decodedInfo) = invalidCallDataLength.decodeCallInfo();
        assertEq(success, false, "Decoding should fail with invalid callData length");
    }

    function testDecodeCallInfoMaxValues() public pure {
        // Create a CallInfo with max values
        address testDest = address(0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF);
        uint256 testValue = type(uint256).max;
        bytes memory testCallData = abi.encode(type(uint256).max, type(uint256).max);

        // Manually encode it
        bytes memory encoded = new bytes(84 + testCallData.length);

        // Copy destination address (20 bytes)
        assembly {
            let ptr := add(encoded, 32) // Skip length word
            mstore(ptr, 0) // Clear the slot
            mstore(add(ptr, 12), testDest) // Store address with 12 bytes left padding
        }

        // Copy value (32 bytes)
        assembly {
            let ptr := add(add(encoded, 32), 20) // Skip length word + dest
            mstore(ptr, testValue)
        }

        // Copy callData length (32 bytes)
        assembly {
            let ptr := add(add(encoded, 32), 52) // Skip length word + dest + value
            mstore(ptr, mload(testCallData)) // Store callData length
        }

        // Copy callData
        assembly {
            let srcPtr := add(testCallData, 32) // Skip length word
            let destPtr := add(add(encoded, 32), 84) // Skip length word + dest + value + callData length
            let len := mload(testCallData)

            for { let i := 0 } lt(i, len) { i := add(i, 32) } {
                let chunk := mload(add(srcPtr, i))
                mstore(add(destPtr, i), chunk)

                if gt(add(i, 32), len) {
                    let remaining := sub(len, i)
                    mstore(add(add(destPtr, i), remaining), 0)
                }
            }
        }

        // Decode and verify
        (bool success, CallInfo memory decodedInfo) = encoded.decodeCallInfo();

        assertEq(success, true, "Decoding with max values should succeed");
        assertEq(decodedInfo.dest, testDest, "Destination address mismatch with max values");
        assertEq(decodedInfo.value, testValue, "Value mismatch with max values");
        assertEq(keccak256(decodedInfo.callData), keccak256(testCallData), "CallData mismatch with max values");
    }

    // ====================================================================================================
    // HELPERS

    function encodeCallInfoArray(CallInfo[] memory calls) internal pure returns (bytes memory encodedArray) {
        // Calculate the total size needed for the encoded data
        uint256 totalSize = 32; // 32 bytes for the array length
        for (uint256 i = 0; i < calls.length; i++) {
            totalSize += 84 + calls[i].callData.length; // 20 (dest) + 32 (value) + 32 (callData.length) + callData.length
        }

        encodedArray = new bytes(totalSize);
        bytes32 outputPtr;
        assembly {
            mstore(add(encodedArray, 32), mload(calls)) // Store the CallInfoArray length (32 bytes)
            outputPtr := add(encodedArray, 64) // Skip the encodedArray.length and CallInfoArray.length slots
        }

        bytes32 destPtr;
        bytes32 valuePtr;

        // Encode each CallInfo struct
        for (uint256 i = 0; i < calls.length; i++) {
            CallInfo memory callInfo = calls[i];

            // Encode dest (20 bytes)
            assembly {
                destPtr := callInfo
                mcopy(outputPtr, add(destPtr, 12), 20) // Address is left padded by 12 bytes
                outputPtr := add(outputPtr, 20)
            }

            // Encode value (32 bytes)
            assembly {
                valuePtr := add(destPtr, 32)
                mcopy(outputPtr, valuePtr, 32)
                outputPtr := add(outputPtr, 32)
            }

            // Encode callData.length (32 bytes)
            bytes memory callData = callInfo.callData;
            uint256 callDataLen = callData.length;
            assembly {
                mstore(outputPtr, callDataLen)
                outputPtr := add(outputPtr, 32)
            }

            // Encode callData
            if (callDataLen > 0) {
                assembly {
                    mcopy(outputPtr, add(callData, 32), callDataLen)
                    outputPtr := add(outputPtr, callDataLen)
                }
            }
        }
    }
}
