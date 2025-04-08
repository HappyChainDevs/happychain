// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {Boop} from "boop/core/Boop.sol";
import {Encoding} from "boop/libs/Encoding.sol";

contract CoreLibsTest is Test {
    using Encoding for Boop;

    // ====================================================================================================
    // TESTS FOR {Encoding.encode}

    function testEncodeEmptyDynamicFields() public pure {
        Boop memory input = Boop({
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

        bytes memory encoded = input.encode();
        assertEq(encoded, expected);
    }

    function testEncodeSmallDynamicFields() public pure {
        Boop memory input = Boop({
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

        bytes memory encoded = input.encode();
        assertEq(encoded, expected);
    }

    function testEncodeLongDynamicFields() public pure {
        Boop memory input = Boop({
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

        bytes memory encoded = input.encode();
        assertEq(encoded, expected);
    }

    // ====================================================================================================
    // TESTS FOR {Encoding.decode}

    function testDecodeEmptyDynamicFields() public view {
        bytes memory encoded =
            hex"1234567890123456789012345678901234567890000f4240000c3500000c3501000c3502234567890123456789012345678901234567890134567890123456789012345678901234567890120000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000004d2000000000000162e00000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e10000000000000000000000000000000000"; // solhint-disable-line max-line-length

        Boop memory decoded = this.decode(encoded);

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

        Boop memory decoded = this.decode(encoded);

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

        Boop memory decoded = this.decode(encoded);

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
    // TESTS FOR {Encoding.encode} <-> {Encoding.decode}

    function testCombinedEmpty() public view {
        Boop memory input = Boop({
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

        bytes memory encoded = input.encode();
        Boop memory decoded = this.decode(encoded);

        assertEq(decoded.account, input.account);
        assertEq(decoded.gasLimit, input.gasLimit);
        assertEq(decoded.executeGasLimit, input.executeGasLimit);
        assertEq(decoded.dest, input.dest);
        assertEq(decoded.paymaster, input.paymaster);
        assertEq(decoded.value, input.value);
        assertEq(decoded.nonceTrack, input.nonceTrack);
        assertEq(decoded.nonceValue, input.nonceValue);
        assertEq(decoded.maxFeePerGas, input.maxFeePerGas);
        assertEq(decoded.submitterFee, input.submitterFee);
        assertEq(decoded.callData, input.callData);
        assertEq(decoded.paymasterData, input.paymasterData);
        assertEq(decoded.validatorData, input.validatorData);
        assertEq(decoded.extraData, input.extraData);
    }

    function testCombinedSmall() public view {
        Boop memory input = Boop({
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

        bytes memory encoded = input.encode();
        Boop memory decoded = this.decode(encoded);

        assertEq(decoded.account, input.account);
        assertEq(decoded.gasLimit, input.gasLimit);
        assertEq(decoded.executeGasLimit, input.executeGasLimit);
        assertEq(decoded.dest, input.dest);
        assertEq(decoded.paymaster, input.paymaster);
        assertEq(decoded.value, input.value);
        assertEq(decoded.nonceTrack, input.nonceTrack);
        assertEq(decoded.nonceValue, input.nonceValue);
        assertEq(decoded.maxFeePerGas, input.maxFeePerGas);
        assertEq(decoded.submitterFee, input.submitterFee);
        assertEq(decoded.callData, input.callData);
        assertEq(decoded.paymasterData, input.paymasterData);
        assertEq(decoded.validatorData, input.validatorData);
        assertEq(decoded.extraData, input.extraData);
    }

    function testCombinedLong() public view {
        Boop memory input = Boop({
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

        bytes memory encoded = input.encode();
        Boop memory decoded = this.decode(encoded);

        assertEq(decoded.account, input.account);
        assertEq(decoded.gasLimit, input.gasLimit);
        assertEq(decoded.executeGasLimit, input.executeGasLimit);
        assertEq(decoded.dest, input.dest);
        assertEq(decoded.paymaster, input.paymaster);
        assertEq(decoded.value, input.value);
        assertEq(decoded.nonceTrack, input.nonceTrack);
        assertEq(decoded.nonceValue, input.nonceValue);
        assertEq(decoded.maxFeePerGas, input.maxFeePerGas);
        assertEq(decoded.submitterFee, input.submitterFee);
        assertEq(decoded.callData, input.callData);
        assertEq(decoded.paymasterData, input.paymasterData);
        assertEq(decoded.validatorData, input.validatorData);
        assertEq(decoded.extraData, input.extraData);
    }

    function decode(bytes calldata encodedBoop) external pure returns (Boop memory) {
        return Encoding.decode(encodedBoop);
    }
}
