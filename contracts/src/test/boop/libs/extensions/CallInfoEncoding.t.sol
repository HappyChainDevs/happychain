// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {CallInfo, CallInfoEncoding} from "../../../../boop/core/CallInfoEncoding.sol";

contract CallInfoEncodingTest is Test {
    using CallInfoEncoding for bytes;

    // ====================================================================================================
    // TESTS FOR {CallInfoEncoding.decodeCallInfoArray}

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

    function testEncodeDecodeCallInfoArraySingleCallInfo() public pure {
        // Create a single CallInfo
        bytes memory testCallData = abi.encodeWithSignature("transfer(address,uint256)", address(0xBEEF), 100);
        CallInfo[] memory calls = new CallInfo[](1);
        calls[0] = CallInfo({
            dest: address(0x1234567890123456789012345678901234567890),
            value: 42 ether,
            callData: testCallData
        });

        // Encode using our helper function
        bytes memory encoded = encodeCallInfoArray(calls);

        // Decode and verify
        (bool success, CallInfo[] memory decodedCalls) = encoded.decodeCallInfoArray();

        assertEq(success, true);
        _assertCallInfoArraysEqual(calls, decodedCalls);
    }

    function testEncodeDecodeCallInfoArrayMultipleCallInfos() public pure {
        // Create multiple CallInfos with different properties
        CallInfo[] memory calls = new CallInfo[](3);

        // First call - standard transfer
        calls[0] = CallInfo({
            dest: address(0x1234567890123456789012345678901234567890),
            value: 42 ether,
            callData: abi.encodeWithSignature("transfer(address,uint256)", address(0x1111), 100)
        });

        // Second call - empty callData
        calls[1] =
            CallInfo({dest: address(0x1234567890123456789012345678901234567890), value: 0, callData: new bytes(0)});

        // Third call - complex callData
        calls[2] = CallInfo({
            dest: address(0x1234567890123456789012345678901234567890),
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
        _assertCallInfoArraysEqual(calls, decodedCalls);
    }

    function testEncodeDecodeCallInfoArrayWithOffset() public pure {
        // Create CallInfo array
        CallInfo[] memory calls = new CallInfo[](2);
        calls[0] = CallInfo({
            dest: address(0x1234567890123456789012345678901234567890),
            value: 42 ether,
            callData: abi.encodeWithSignature("methodA(uint256)", 123)
        });
        calls[1] = CallInfo({
            dest: address(0x1234567890123456789012345678901234567890),
            value: 0,
            callData: abi.encodeWithSignature("methodB(bool)", true)
        });

        // Add prefix to test offset
        bytes memory prefix = abi.encode("prefix data");
        uint256 offset = prefix.length;

        // Encode the CallInfo array
        bytes memory encodedCalls = encodeCallInfoArray(calls);

        // Create a new buffer with prefix + encoded calls
        bytes memory data = new bytes(prefix.length + encodedCalls.length);
        assembly {
            // Copy prefix
            mcopy(
                add(data, 32), // destination: data array content (skip length word)
                add(prefix, 32), // source: prefix array content (skip length word)
                mload(prefix) // length: prefix length
            )

            // Copy encoded calls
            mcopy(
                add(add(data, 32), offset), // destination: data array content + offset
                add(encodedCalls, 32), // source: encodedCalls array content (skip length word)
                mload(encodedCalls) // length: encodedCalls length
            )
        }

        // Decode with offset and verify
        (bool success, CallInfo[] memory decodedCalls) = data.decodeCallInfoArray(offset);

        assertEq(success, true);
        _assertCallInfoArraysEqual(calls, decodedCalls);
    }

    // ====================================================================================================
    // TESTS FOR {CallInfoEncoding.decodeCallInfo}

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

        // Create a CallInfo struct
        CallInfo memory info = CallInfo({dest: testDest, value: testValue, callData: testCallData});

        // Use our helper function to encode it
        bytes memory encoded = encodeCallInfo(info);

        // Decode and verify
        (bool success, CallInfo memory decodedInfo) = encoded.decodeCallInfo();

        assertEq(success, true, "Decoding should succeed");
        assertEq(decodedInfo.dest, testDest, "Destination address mismatch");
        assertEq(decodedInfo.value, testValue, "Value mismatch");
        assertEq(keccak256(decodedInfo.callData), keccak256(testCallData), "CallData mismatch");
    }

    function testDecodeCallInfoWithOffset() public pure {
        // Create a simple CallInfo
        address testDest = address(0x1234567890123456789012345678901234567890);
        uint256 testValue = 42 ether;
        bytes memory testCallData = abi.encodeWithSignature("approve(address,uint256)", address(0xDEAD), 100);

        // Add some prefix data to test offset
        bytes memory prefix = abi.encode("prefix data for testing offset");
        uint256 offset = prefix.length;

        // Create a CallInfo struct
        CallInfo memory info = CallInfo({dest: testDest, value: testValue, callData: testCallData});

        // Encode the CallInfo
        bytes memory callInfoEncoded = encodeCallInfo(info);

        // Create a new buffer with prefix + encoded CallInfo
        bytes memory encoded = new bytes(prefix.length + callInfoEncoded.length);

        // Copy data using mcopy
        assembly {
            // Copy prefix
            mcopy(
                add(encoded, 32), // destination: encoded array content (skip length word)
                add(prefix, 32), // source: prefix array content (skip length word)
                mload(prefix) // length: prefix length
            )

            // Copy encoded CallInfo
            mcopy(
                add(add(encoded, 32), offset), // destination: encoded array content + offset
                add(callInfoEncoded, 32), // source: callInfoEncoded array content (skip length word)
                mload(callInfoEncoded) // length: callInfoEncoded length
            )
        }

        // Decode with offset and verify
        (bool success, CallInfo memory decodedInfo) = encoded.decodeCallInfo(offset);

        assertEq(success, true, "Decoding with offset should succeed");
        assertEq(decodedInfo.dest, testDest, "Destination address mismatch with offset");
        assertEq(decodedInfo.value, testValue, "Value mismatch with offset");
        assertEq(keccak256(decodedInfo.callData), keccak256(testCallData), "CallData mismatch with offset");
    }

    function testDecodeCallInfoEmptyCallData() public pure {
        // Create a CallInfo with empty callData
        address testDest = address(0x1234567890123456789012345678901234567890);
        uint256 testValue = 42 ether;

        // Create a CallInfo struct with empty callData
        CallInfo memory info = CallInfo({
            dest: testDest,
            value: testValue,
            callData: new bytes(0) // Empty callData
        });

        // Use our helper function to encode it
        bytes memory encoded = encodeCallInfo(info);

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
        bytes memory testCallData = abi.encode("transfer", type(uint256).max, type(uint256).max);

        // Create a CallInfo struct with max values
        CallInfo memory info = CallInfo({dest: testDest, value: testValue, callData: testCallData});

        // Use our helper function to encode it
        bytes memory encoded = encodeCallInfo(info);

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

    function encodeCallInfo(CallInfo memory callInfo) internal pure returns (bytes memory encoded) {
        // Calculate the total size needed for the encoded data
        uint256 callDataLen = callInfo.callData.length;
        uint256 totalSize = 84 + callDataLen; // 20 (dest) + 32 (value) + 32 (callData.length) + callData.length

        encoded = new bytes(totalSize);
        bytes32 outputPtr;
        assembly {
            outputPtr := add(encoded, 32) // Skip the length word

            // Encode dest (20 bytes)
            let destPtr := callInfo
            mcopy(outputPtr, add(destPtr, 12), 20) // Address is left padded by 12 bytes
            outputPtr := add(outputPtr, 20)

            // Encode value (32 bytes)
            let valuePtr := add(callInfo, 32) // Skip dest
            mcopy(outputPtr, valuePtr, 32)
            outputPtr := add(outputPtr, 32)

            // Encode callData.length (32 bytes)
            mstore(outputPtr, callDataLen)
            outputPtr := add(outputPtr, 32)
        }

        // Encode callData
        if (callDataLen > 0) {
            bytes memory callData = callInfo.callData;
            assembly {
                mcopy(outputPtr, add(callData, 32), callDataLen) // Skip callData length word
            }
        }

        return encoded;
    }

    function _assertCallInfoArraysEqual(CallInfo[] memory expected, CallInfo[] memory actual) internal pure {
        assertEq(actual.length, expected.length);

        for (uint256 i = 0; i < expected.length; i++) {
            assertEq(actual[i].dest, expected[i].dest);
            assertEq(actual[i].value, expected[i].value);
            assertEq(keccak256(actual[i].callData), keccak256(expected[i].callData));
        }
    }
}
