// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {Utils} from "../../../boop/core/Utils.sol";

contract UtilsTest is Test {
    using Utils for bytes;

    // ====================================================================================================
    // TESTS FOR {Utils.getExtraDataValue}

    function testGEDSingleKeyValue() public pure {
        // Test for single key-value pair
        bytes memory data = new bytes(9); // 3 (key) + 3 (length) + 3 (value)

        // Set key 'abc'
        data[0] = 0x61; // 'a'
        data[1] = 0x62; // 'b'
        data[2] = 0x63; // 'c'
        // Set length to 3
        data[3] = 0x00;
        data[4] = 0x00;
        data[5] = 0x03;
        // Set value to 'xyz'
        data[6] = 0x78; // 'x'
        data[7] = 0x79; // 'y'
        data[8] = 0x7a; // 'z'

        (bool found, bytes memory value) = data.getExtraDataValue(bytes3(hex"616263"));
        assertTrue(found, "Should find existing key");
        assertEq(value.length, 3, "Value length should match");
        assertEq(bytes1(value[0]), bytes1(0x78), "First byte should match");
        assertEq(bytes1(value[1]), bytes1(0x79), "Second byte should match");
        assertEq(bytes1(value[2]), bytes1(0x7a), "Third byte should match");
    }

    function testGEDKeyNotFound() public pure {
        // Test for key not found
        bytes memory data = new bytes(9);

        // Set key 'abc'
        data[0] = 0x61; // 'a'
        data[1] = 0x62; // 'b'
        data[2] = 0x63; // 'c'
        // Set length to 3
        data[3] = 0x00;
        data[4] = 0x00;
        data[5] = 0x03;
        // Set value to 'xyz'
        data[6] = 0x78; // 'x'
        data[7] = 0x79; // 'y'
        data[8] = 0x7a; // 'z'

        (bool found, bytes memory value) = data.getExtraDataValue(bytes3(hex"646566")); // 'def'
        assertFalse(found, "Should not find non-existent key");
        assertEq(value.length, 0, "Value should be empty for non-existent key");
    }

    function testGEDMultipleKeyValues() public pure {
        // Test for multiple key-value pairs
        bytes memory multiData = new bytes(18); // Two pairs of 9 bytes each

        // Set key 'abc'
        multiData[0] = 0x61; // 'a'
        multiData[1] = 0x62; // 'b'
        multiData[2] = 0x63; // 'c'
        // Set length to 3
        multiData[3] = 0x00;
        multiData[4] = 0x00;
        multiData[5] = 0x03;
        // Set value to 'xyz'
        multiData[6] = 0x78; // 'x'
        multiData[7] = 0x79; // 'y'
        multiData[8] = 0x7a; // 'z'

        // Second pair: key='def', length=3, value='123'
        multiData[9] = 0x64; // 'd'
        multiData[10] = 0x65; // 'e'
        multiData[11] = 0x66; // 'f'
        multiData[12] = 0x00; // length=3
        multiData[13] = 0x00;
        multiData[14] = 0x03;
        multiData[15] = 0x31; // '1'
        multiData[16] = 0x32; // '2'
        multiData[17] = 0x33; // '3'

        (bool found, bytes memory value) = multiData.getExtraDataValue(bytes3(hex"646566")); // 'def'
        assertTrue(found, "Should find second key");
        assertEq(value.length, 3, "Second value length should match");
        assertEq(bytes1(value[0]), bytes1(0x31), "First byte should match");
        assertEq(bytes1(value[1]), bytes1(0x32), "Second byte should match");
        assertEq(bytes1(value[2]), bytes1(0x33), "Third byte should match");
    }

    function testGEDEmptyData() public pure {
        // Test for empty data
        (bool found, bytes memory value) = new bytes(0).getExtraDataValue(bytes3(hex"616263"));
        assertFalse(found, "Should not find key in empty data");
        assertEq(value.length, 0, "Value should be empty for empty data");
    }

    function testGEDInvalidDataTooShort() public pure {
        // Test for invalid data (too short)
        bytes memory invalidData = new bytes(5); // Less than minimum 6 bytes needed
        // Set key 'abc'
        invalidData[0] = 0x61; // 'a'
        invalidData[1] = 0x62; // 'b'
        invalidData[2] = 0x63; // 'c'
        // Set length to 3 (Not enough bytes to encode the length)
        invalidData[3] = 0x00;
        invalidData[4] = 0x00;

        (bool found, bytes memory value) = invalidData.getExtraDataValue(bytes3(hex"616263"));
        assertFalse(found, "Should not find key in invalid data");
        assertEq(value.length, 0, "Value should be empty for invalid data");
    }

    function testGEDLengthExceedsAvailableBytes() public pure {
        // Test for length exceeds available bytes
        bytes memory truncatedData = new bytes(8); // Only enough for key + length + 1 byte of value

        // Set key 'abc'
        truncatedData[0] = 0x61; // 'a'
        truncatedData[1] = 0x62; // 'b'
        truncatedData[2] = 0x63; // 'c'

        // Set length to 4 (but we only have space for 1 byte of value)
        truncatedData[3] = 0x00;
        truncatedData[4] = 0x00;
        truncatedData[5] = 0x04;

        // Set only 1 byte of value
        truncatedData[6] = 0x78; // 'x'
        // truncatedData[7], truncatedData[8], truncatedData[9] would be needed for the full value
        // but we don't have enough space, so the function should return not found

        (bool found, bytes memory value) = truncatedData.getExtraDataValue(bytes3(hex"616263"));
        assertFalse(found, "Should not find key when length exceeds available bytes");
        assertEq(value.length, 0, "Value should be empty when length exceeds available bytes");
    }
}
