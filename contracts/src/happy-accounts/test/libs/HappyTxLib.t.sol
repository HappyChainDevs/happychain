// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {HappyTx} from "boop/core/HappyTx.sol";
import {HappyTxLib} from "boop/libs/HappyTxLib.sol";

contract HappyTxLibTest is Test {
    using HappyTxLib for bytes;
    using HappyTxLib for HappyTx;

    // ====================================================================================================
    // TESTS FOR {HappyTxLib.encode}

    function testEncodeEmptyDynamicFields() public pure {
        HappyTx memory inputTx = HappyTx({
            account: 0x1234567890123456789012345678901234567890,
            gasLimit: 1000000, // 0xF4240
            validateGasLimit: 800000, // 0xC3500
            executeGasLimit: 800001, // 0xC3501
            validatePaymentGasLimit: 800002, // 0xC3502
            dest: 0x2345678901234567890123456789012345678901,
            paymaster: 0x3456789012345678901234567890123456789012,
            value: 1000000000000000000, // 0xDE0B6B3A7640000
            nonceTrack: 1234, // 0x4D2
            nonceValue: 5678, // 0x162E
            maxFeePerGas: 2000000000, // 0x77359400
            submitterFee: 100000000, // 0x5F5E100
            callData: hex"",
            paymasterData: "",
            validatorData: "",
            extraData: ""
        });

        bytes memory expected =
            hex"1234567890123456789012345678901234567890000f4240000c3500000c3501000c3502234567890123456789012345678901234567890134567890123456789012345678901234567890120000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000004d2000000000000162e00000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e10000000000000000000000000000000000"; // solhint-disable-line max-line-length

        bytes memory encoded = inputTx.encode();
        assertEq(encoded, expected);
    }

    function testEncodeSmallDynamicFields() public pure {
        HappyTx memory inputTx = HappyTx({
            account: 0x1234567890123456789012345678901234567890,
            gasLimit: 1000000, // 0x000F4240
            validateGasLimit: 800000, // 0x000C3500
            executeGasLimit: 800001, // 0x000C3501
            validatePaymentGasLimit: 800002, // 0x000C3502
            dest: 0x2345678901234567890123456789012345678901,
            paymaster: 0x3456789012345678901234567890123456789012,
            value: 1000000000000000000, // 0xDE0B6B3A7640000
            nonceTrack: 1234, // 0x4D2
            nonceValue: 5678, // 0x162E
            maxFeePerGas: 2000000000, // 0x77359400
            submitterFee: 100000000, // 0x5F5E100
            callData: hex"1234",
            paymasterData: hex"5678",
            validatorData: hex"9abc",
            extraData: hex"def0"
        });

        bytes memory expected =
            hex"1234567890123456789012345678901234567890000f4240000c3500000c3501000c3502234567890123456789012345678901234567890134567890123456789012345678901234567890120000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000004d2000000000000162e00000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e100000000021234000000025678000000029abc00000002def0"; // solhint-disable-line max-line-length

        bytes memory encoded = inputTx.encode();
        assertEq(encoded, expected);
    }

    function testEncodeLongDynamicFields() public pure {
        HappyTx memory inputTx = HappyTx({
            account: 0x1234567890123456789012345678901234567890,
            gasLimit: 1000000, // 0xF4240
            validateGasLimit: 800000, // 0xC3500
            executeGasLimit: 800001, // 0xC3501
            validatePaymentGasLimit: 800002, // 0xC3502
            dest: 0x2345678901234567890123456789012345678901,
            paymaster: 0x3456789012345678901234567890123456789012,
            value: 1000000000000000000, // 0xDE0B6B3A7640000
            nonceTrack: 1234, // 0x4D2
            nonceValue: 5678, // 0x162E
            maxFeePerGas: 2000000000, // 0x77359400
            submitterFee: 100000000, // 0x5F5E100
            callData: hex"40c10f190000000000000000000000004bc8e81ad3be83276837f184138fc96770c1429700000000000000000000000000000000000000000000000000038d7ea4c68000",
            paymasterData: hex"789078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890",
            validatorData: hex"827a29d9e7e5e37adc8ae5ead7993f7d354da82a35a05da3fef21d133e22082f376916126bfece3e226c3a9bfb55354783deb43b58989d0a29ec53b4f36560cc1b",
            extraData: hex"def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0"
        });

        bytes memory expected =
            hex"1234567890123456789012345678901234567890000f4240000c3500000c3501000c3502234567890123456789012345678901234567890134567890123456789012345678901234567890120000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000004d2000000000000162e00000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e1000000004440c10f190000000000000000000000004bc8e81ad3be83276837f184138fc96770c1429700000000000000000000000000000000000000000000000000038d7ea4c680000000003078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890789000000041827a29d9e7e5e37adc8ae5ead7993f7d354da82a35a05da3fef21d133e22082f376916126bfece3e226c3a9bfb55354783deb43b58989d0a29ec53b4f36560cc1b00000022def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0"; // solhint-disable-line max-line-length

        bytes memory encoded = inputTx.encode();
        assertEq(encoded, expected);
    }

    // ====================================================================================================
    // TESTS FOR {HappyTxLib.decode}

    function testDecodeEmptyDynamicFields() public view {
        bytes memory encoded =
            hex"1234567890123456789012345678901234567890000f4240000c3500000c3501000c3502234567890123456789012345678901234567890134567890123456789012345678901234567890120000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000004d2000000000000162e00000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e10000000000000000000000000000000000"; // solhint-disable-line max-line-length

        HappyTx memory decoded = this.decode(encoded);

        assertEq(decoded.account, address(0x1234567890123456789012345678901234567890));
        assertEq(decoded.gasLimit, 1000000); // 000F4240
        assertEq(decoded.validateGasLimit, 800000); // 000C3500
        assertEq(decoded.executeGasLimit, 800001); // 000C3501
        assertEq(decoded.validatePaymentGasLimit, 800002); // 000C3502
        assertEq(decoded.dest, address(0x2345678901234567890123456789012345678901));
        assertEq(decoded.paymaster, address(0x3456789012345678901234567890123456789012));
        assertEq(decoded.value, 1000000000000000000);
        assertEq(decoded.nonceTrack, 1234);
        assertEq(decoded.nonceValue, 5678);
        assertEq(decoded.maxFeePerGas, 2000000000);
        assertEq(decoded.submitterFee, 100000000);
        assertEq(decoded.callData, "");
        assertEq(decoded.paymasterData, "");
        assertEq(decoded.validatorData, "");
        assertEq(decoded.extraData, "");
    }

    function testDecodeSmallDynamicFields() public view {
        bytes memory encoded =
            hex"1234567890123456789012345678901234567890000f4240000c3500000c3501000c3502234567890123456789012345678901234567890134567890123456789012345678901234567890120000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000004d2000000000000162e00000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e100000000021234000000025678000000029abc00000002def0"; // solhint-disable-line max-line-length

        HappyTx memory decoded = this.decode(encoded);

        assertEq(decoded.account, address(0x1234567890123456789012345678901234567890));
        assertEq(decoded.gasLimit, 1000000);
        assertEq(decoded.validateGasLimit, 800000);
        assertEq(decoded.executeGasLimit, 800001);
        assertEq(decoded.validatePaymentGasLimit, 800002);
        assertEq(decoded.dest, address(0x2345678901234567890123456789012345678901));
        assertEq(decoded.paymaster, address(0x3456789012345678901234567890123456789012));
        assertEq(decoded.value, 1000000000000000000);
        assertEq(decoded.nonceTrack, 1234);
        assertEq(decoded.nonceValue, 5678);
        assertEq(decoded.maxFeePerGas, 2000000000);
        assertEq(decoded.submitterFee, 100000000);
        assertEq(decoded.callData, hex"1234");
        assertEq(decoded.paymasterData, hex"5678");
        assertEq(decoded.validatorData, hex"9abc");
        assertEq(decoded.extraData, hex"def0");
    }

    function testDecodeLongDynamicFields() public view {
        bytes memory encoded =
            hex"1234567890123456789012345678901234567890000f4240000c3500000c3501000c3502234567890123456789012345678901234567890134567890123456789012345678901234567890120000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000004d2000000000000162e00000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e1000000004440c10f190000000000000000000000004bc8e81ad3be83276837f184138fc96770c1429700000000000000000000000000000000000000000000000000038d7ea4c680000000003078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890789000000041827a29d9e7e5e37adc8ae5ead7993f7d354da82a35a05da3fef21d133e22082f376916126bfece3e226c3a9bfb55354783deb43b58989d0a29ec53b4f36560cc1b00000022def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0"; // solhint-disable-line max-line-length

        HappyTx memory decoded = this.decode(encoded);

        assertEq(decoded.account, address(0x1234567890123456789012345678901234567890));
        assertEq(decoded.gasLimit, 1000000);
        assertEq(decoded.validateGasLimit, 800000);
        assertEq(decoded.executeGasLimit, 800001);
        assertEq(decoded.validatePaymentGasLimit, 800002);
        assertEq(decoded.dest, address(0x2345678901234567890123456789012345678901));
        assertEq(decoded.paymaster, address(0x3456789012345678901234567890123456789012));
        assertEq(decoded.value, 1000000000000000000);
        assertEq(decoded.nonceTrack, 1234);
        assertEq(decoded.nonceValue, 5678);
        assertEq(decoded.maxFeePerGas, 2000000000);
        assertEq(decoded.submitterFee, 100000000);
        assertEq(
            decoded.callData,
            hex"40c10f190000000000000000000000004bc8e81ad3be83276837f184138fc96770c1429700000000000000000000000000000000000000000000000000038d7ea4c68000"
        );
        assertEq(
            decoded.paymasterData,
            hex"789078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890"
        );
        assertEq(
            decoded.validatorData,
            hex"827a29d9e7e5e37adc8ae5ead7993f7d354da82a35a05da3fef21d133e22082f376916126bfece3e226c3a9bfb55354783deb43b58989d0a29ec53b4f36560cc1b"
        );
        assertEq(decoded.extraData, hex"def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0");
    }

    // ====================================================================================================
    // TESTS FOR {HappyTxLib.encode} <-> {HappyTxLib.decode}

    function testCombinedEmpty() public view {
        HappyTx memory inputTx = HappyTx({
            account: 0x1234567890123456789012345678901234567890,
            gasLimit: 1000000, // 0xF4240
            validateGasLimit: 800000, // 0xC3500
            executeGasLimit: 800001, // 0xC3501
            validatePaymentGasLimit: 800002, // 0xC3502
            dest: 0x2345678901234567890123456789012345678901,
            paymaster: 0x3456789012345678901234567890123456789012,
            value: 1000000000000000000, // 0xDE0B6B3A7640000
            nonceTrack: 1234, // 0x4D2
            nonceValue: 5678, // 0x162E
            maxFeePerGas: 2000000000, // 0x77359400
            submitterFee: 100000000, // 0x5F5E100
            callData: "",
            paymasterData: "",
            validatorData: "",
            extraData: ""
        });

        bytes memory encoded = inputTx.encode();
        HappyTx memory decoded = this.decode(encoded);

        assertEq(decoded.account, inputTx.account);
        assertEq(decoded.gasLimit, inputTx.gasLimit);
        assertEq(decoded.executeGasLimit, inputTx.executeGasLimit);
        assertEq(decoded.dest, inputTx.dest);
        assertEq(decoded.paymaster, inputTx.paymaster);
        assertEq(decoded.value, inputTx.value);
        assertEq(decoded.nonceTrack, inputTx.nonceTrack);
        assertEq(decoded.nonceValue, inputTx.nonceValue);
        assertEq(decoded.maxFeePerGas, inputTx.maxFeePerGas);
        assertEq(decoded.submitterFee, inputTx.submitterFee);
        assertEq(decoded.callData, inputTx.callData);
        assertEq(decoded.paymasterData, inputTx.paymasterData);
        assertEq(decoded.validatorData, inputTx.validatorData);
        assertEq(decoded.extraData, inputTx.extraData);
    }

    function testCombinedSmall() public view {
        HappyTx memory inputTx = HappyTx({
            account: 0x1234567890123456789012345678901234567890,
            gasLimit: 1000000, // 0xF4240
            validateGasLimit: 800000, // 0xC3500
            executeGasLimit: 800001, // 0xC3501
            validatePaymentGasLimit: 800002, // 0xC3502
            dest: 0x2345678901234567890123456789012345678901,
            paymaster: 0x3456789012345678901234567890123456789012,
            value: 1000000000000000000, // 0xDE0B6B3A7640000
            nonceTrack: 1234, // 0x4D2
            nonceValue: 5678, // 0x162E
            maxFeePerGas: 2000000000, // 0x77359400
            submitterFee: 100000000, // 0x5F5E100
            callData: hex"1234",
            paymasterData: hex"5678",
            validatorData: hex"9abc",
            extraData: hex"def0"
        });

        bytes memory encoded = inputTx.encode();
        HappyTx memory decoded = this.decode(encoded);

        assertEq(decoded.account, inputTx.account);
        assertEq(decoded.gasLimit, inputTx.gasLimit);
        assertEq(decoded.executeGasLimit, inputTx.executeGasLimit);
        assertEq(decoded.dest, inputTx.dest);
        assertEq(decoded.paymaster, inputTx.paymaster);
        assertEq(decoded.value, inputTx.value);
        assertEq(decoded.nonceTrack, inputTx.nonceTrack);
        assertEq(decoded.nonceValue, inputTx.nonceValue);
        assertEq(decoded.maxFeePerGas, inputTx.maxFeePerGas);
        assertEq(decoded.submitterFee, inputTx.submitterFee);
        assertEq(decoded.callData, inputTx.callData);
        assertEq(decoded.paymasterData, inputTx.paymasterData);
        assertEq(decoded.validatorData, inputTx.validatorData);
        assertEq(decoded.extraData, inputTx.extraData);
    }

    function testCombinedLong() public view {
        HappyTx memory inputTx = HappyTx({
            account: 0x1234567890123456789012345678901234567890,
            gasLimit: 1000000, // 0xF4240
            validateGasLimit: 800000, // 0xC3500
            executeGasLimit: 800001, // 0xC3501
            validatePaymentGasLimit: 800002, // 0xC3502
            dest: 0x2345678901234567890123456789012345678901,
            paymaster: 0x3456789012345678901234567890123456789012,
            value: 1000000000000000000, // 0xDE0B6B3A7640000
            nonceTrack: 1234, // 0x4D2
            nonceValue: 5678, // 0x162E
            maxFeePerGas: 2000000000, // 0x77359400
            submitterFee: 100000000, // 0x5F5E100
            callData: hex"40c10f190000000000000000000000004bc8e81ad3be83276837f184138fc96770c1429700000000000000000000000000000000000000000000000000038d7ea4c68000",
            paymasterData: hex"789078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890",
            validatorData: hex"827a29d9e7e5e37adc8ae5ead7993f7d354da82a35a05da3fef21d133e22082f376916126bfece3e226c3a9bfb55354783deb43b58989d0a29ec53b4f36560cc1b",
            extraData: hex"def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0"
        });

        bytes memory encoded = inputTx.encode();
        HappyTx memory decoded = this.decode(encoded);

        assertEq(decoded.account, inputTx.account);
        assertEq(decoded.gasLimit, inputTx.gasLimit);
        assertEq(decoded.executeGasLimit, inputTx.executeGasLimit);
        assertEq(decoded.dest, inputTx.dest);
        assertEq(decoded.paymaster, inputTx.paymaster);
        assertEq(decoded.value, inputTx.value);
        assertEq(decoded.nonceTrack, inputTx.nonceTrack);
        assertEq(decoded.nonceValue, inputTx.nonceValue);
        assertEq(decoded.maxFeePerGas, inputTx.maxFeePerGas);
        assertEq(decoded.submitterFee, inputTx.submitterFee);
        assertEq(decoded.callData, inputTx.callData);
        assertEq(decoded.paymasterData, inputTx.paymasterData);
        assertEq(decoded.validatorData, inputTx.validatorData);
        assertEq(decoded.extraData, inputTx.extraData);
    }

    function decode(bytes calldata encodedHappyTx) external pure returns (HappyTx memory) {
        return HappyTxLib.decode(encodedHappyTx);
    }

    // ====================================================================================================
    // TESTS FOR {HappyTxLib.getExtraDataValue}

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

        (bool found, bytes memory value) = HappyTxLib.getExtraDataValue(data, bytes3(hex"616263"));
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

        (bool found, bytes memory value) = HappyTxLib.getExtraDataValue(data, bytes3(hex"646566")); // 'def'
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

        (bool found, bytes memory value) = HappyTxLib.getExtraDataValue(multiData, bytes3(hex"646566")); // 'def'
        assertTrue(found, "Should find second key");
        assertEq(value.length, 3, "Second value length should match");
        assertEq(bytes1(value[0]), bytes1(0x31), "First byte should match");
        assertEq(bytes1(value[1]), bytes1(0x32), "Second byte should match");
        assertEq(bytes1(value[2]), bytes1(0x33), "Third byte should match");
    }

    function testGEDEmptyData() public pure {
        // Test for empty data
        (bool found, bytes memory value) = HappyTxLib.getExtraDataValue(new bytes(0), bytes3(hex"616263"));
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

        (bool found, bytes memory value) = HappyTxLib.getExtraDataValue(invalidData, bytes3(hex"616263"));
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

        (bool found, bytes memory value) = HappyTxLib.getExtraDataValue(truncatedData, bytes3(hex"616263"));
        assertFalse(found, "Should not find key when length exceeds available bytes");
        assertEq(value.length, 0, "Value should be empty when length exceeds available bytes");
    }
}
