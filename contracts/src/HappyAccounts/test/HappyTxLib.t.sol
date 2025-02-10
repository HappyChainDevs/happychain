// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {HappyTx} from "../core/HappyTx.sol";
import {HappyTxLib} from "../libs/HappyTxLib.sol";

contract HappyTxLibTest is Test {
    using HappyTxLib for bytes;
    using HappyTxLib for HappyTx;

    /// @dev Tests for {HappyTxLib.encode(happyTx);}
    function testEncodeEmptyDynamicFields() public pure {
        HappyTx memory inputTx = HappyTx({
            account: 0x1234567890123456789012345678901234567890,
            gasLimit: 1000000, // 0xF4240
            executeGasLimit: 800000, // 0xC3500
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
            hex"1234567890123456789012345678901234567890000f4240000c3500234567890123456789012345678901234567890134567890123456789012345678901234567890120000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000004d2000000000000162e00000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e10000000000000000000000000000000000"; // solhint-disable-line max-line-length

        bytes memory encoded = inputTx.encode();
        assertEq(encoded, expected);
    }

    function testEncodeSmallDynamicFields() public pure {
        HappyTx memory inputTx = HappyTx({
            account: 0x1234567890123456789012345678901234567890,
            gasLimit: 1000000, // 0xF4240
            executeGasLimit: 800000, // 0xC3500
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
            hex"1234567890123456789012345678901234567890000f4240000c3500234567890123456789012345678901234567890134567890123456789012345678901234567890120000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000004d2000000000000162e00000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e100000000021234000000025678000000029abc00000002def0"; // solhint-disable-line max-line-length

        bytes memory encoded = inputTx.encode();
        assertEq(encoded, expected);
    }

    function testEncodeLongDynamicFields() public pure {
        HappyTx memory inputTx = HappyTx({
            account: 0x1234567890123456789012345678901234567890,
            gasLimit: 1000000, // 0xF4240
            executeGasLimit: 800000, // 0xC3500
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
            hex"1234567890123456789012345678901234567890000f4240000c3500234567890123456789012345678901234567890134567890123456789012345678901234567890120000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000004d2000000000000162e00000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e1000000004440c10f190000000000000000000000004bc8e81ad3be83276837f184138fc96770c1429700000000000000000000000000000000000000000000000000038d7ea4c680000000003078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890789000000041827a29d9e7e5e37adc8ae5ead7993f7d354da82a35a05da3fef21d133e22082f376916126bfece3e226c3a9bfb55354783deb43b58989d0a29ec53b4f36560cc1b00000022def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0"; // solhint-disable-line max-line-length

        bytes memory encoded = inputTx.encode();
        assertEq(encoded, expected);
    }

    /// @dev Tests for {HappyTxLib.decode(happyTx);}
    function testDecodeEmptyDynamicFields() public pure {
        bytes memory encoded =
            hex"1234567890123456789012345678901234567890000f4240000c3500234567890123456789012345678901234567890134567890123456789012345678901234567890120000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000004d2000000000000162e00000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e10000000000000000000000000000000000"; // solhint-disable-line max-line-length

        HappyTx memory decoded = encoded.decode();

        assertEq(decoded.account, address(0x1234567890123456789012345678901234567890));
        assertEq(decoded.gasLimit, 1000000);
        assertEq(decoded.executeGasLimit, 800000);
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

    function testDecodeSmallDynamicFields() public pure {
        bytes memory encoded =
            hex"1234567890123456789012345678901234567890000f4240000c3500234567890123456789012345678901234567890134567890123456789012345678901234567890120000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000004d2000000000000162e00000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e100000000021234000000025678000000029abc00000002def0"; // solhint-disable-line max-line-length

        HappyTx memory decoded = encoded.decode();

        assertEq(decoded.account, address(0x1234567890123456789012345678901234567890));
        assertEq(decoded.gasLimit, 1000000);
        assertEq(decoded.executeGasLimit, 800000);
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

    function testDecodeLongDynamicFields() public pure {
        bytes memory encoded =
            hex"1234567890123456789012345678901234567890000f4240000c3500234567890123456789012345678901234567890134567890123456789012345678901234567890120000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000004d2000000000000162e00000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e1000000004440c10f190000000000000000000000004bc8e81ad3be83276837f184138fc96770c1429700000000000000000000000000000000000000000000000000038d7ea4c680000000003078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890789000000041827a29d9e7e5e37adc8ae5ead7993f7d354da82a35a05da3fef21d133e22082f376916126bfece3e226c3a9bfb55354783deb43b58989d0a29ec53b4f36560cc1b00000022def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0"; // solhint-disable-line max-line-length

        HappyTx memory decoded = encoded.decode();

        assertEq(decoded.account, address(0x1234567890123456789012345678901234567890));
        assertEq(decoded.gasLimit, 1000000);
        assertEq(decoded.executeGasLimit, 800000);
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

    /// @dev Tests for {HappyTxLib.encode(happyTx)} <-> {HappyTxLib.decode(happyTx)}
    function testCombinedEmpty() public pure {
        HappyTx memory inputTx = HappyTx({
            account: 0x1234567890123456789012345678901234567890,
            gasLimit: 1000000, // 0xF4240
            executeGasLimit: 800000, // 0xC3500
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
        HappyTx memory decoded = encoded.decode();

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

    function testCombinedSmall() public pure {
        HappyTx memory inputTx = HappyTx({
            account: 0x1234567890123456789012345678901234567890,
            gasLimit: 1000000, // 0xF4240
            executeGasLimit: 800000, // 0xC3500
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
        HappyTx memory decoded = encoded.decode();

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

    function testCombinedLong() public pure {
        HappyTx memory inputTx = HappyTx({
            account: 0x1234567890123456789012345678901234567890,
            gasLimit: 1000000, // 0xF4240
            executeGasLimit: 800000, // 0xC3500
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
        HappyTx memory decoded = encoded.decode();

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
}
