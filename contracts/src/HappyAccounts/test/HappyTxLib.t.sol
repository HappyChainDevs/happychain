// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {HappyTx} from "../core/HappyTx.sol";
import {HappyTxLib} from "../libs/HappyTxLib.sol";

contract HappyTxLibTest is Test {
    using HappyTxLib for bytes;

    function testDecodeEmptyDynamicFields() public pure {
        bytes memory encoded =
            hex"123456789012345678901234567890123456789023456789012345678901234534567890123456789012345678901234567890126789012345678901000f42400000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e10000000000000000020000000002000000000000000000000000000000000c35001234"; // solhint-disable-line max-line-length

        HappyTx memory decoded = encoded.decode();

        assertEq(decoded.account, address(0x1234567890123456789012345678901234567890));
        assertEq(decoded.gasLimit, 1000000);
        assertEq(decoded.executeGasLimit, 800000);
        assertEq(decoded.dest, address(0x2345678901234567890123456789012345678901));
        assertEq(decoded.paymaster, address(0x3456789012345678901234567890123456789012));
        assertEq(decoded.value, 1000000000000000000);
        assertEq(decoded.nonce, 1);
        assertEq(decoded.maxFeePerGas, 2000000000);
        assertEq(decoded.submitterFee, 100000000);
        assertEq(decoded.callData, hex"1234");
        assertEq(decoded.paymasterData, "");
        assertEq(decoded.validatorData, "");
        assertEq(decoded.extraData, "");
    }

    function testDecodeSmallDynamicFields() public pure {
        bytes memory encoded =
            hex"123456789012345678901234567890123456789023456789012345678901234534567890123456789012345678901234567890126789012345678901000f42400000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e10000000000000000080000000002000000000200000000020000000002000c3500123456789abcdef0"; // solhint-disable-line max-line-length

        HappyTx memory decoded = encoded.decode();

        assertEq(decoded.account, address(0x1234567890123456789012345678901234567890));
        assertEq(decoded.gasLimit, 1000000);
        assertEq(decoded.executeGasLimit, 800000);
        assertEq(decoded.dest, address(0x2345678901234567890123456789012345678901));
        assertEq(decoded.paymaster, address(0x3456789012345678901234567890123456789012));
        assertEq(decoded.value, 1000000000000000000);
        assertEq(decoded.nonce, 1);
        assertEq(decoded.maxFeePerGas, 2000000000);
        assertEq(decoded.submitterFee, 100000000);
        assertEq(decoded.callData, hex"1234");
        assertEq(decoded.paymasterData, hex"5678");
        assertEq(decoded.validatorData, hex"9abc");
        assertEq(decoded.extraData, hex"def0");
    }

    function testDecodeLongDynamicFields() public pure {
        bytes memory encoded =
            hex"123456789012345678901234567890123456789023456789012345678901234534567890123456789012345678901234567890126789012345678901000f42400000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e10000000000000000840000000030000000003000000000020000000022000c3500abcdef123456abcdef123456abcdef123456abcdef123456abcdef123456abcdef123456abcdef123456abcdef1234567890789078907890789078907890789078907890789078907890789078907890789078907890789078907890789078909abcdef0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0"; // solhint-disable-line max-line-length

        HappyTx memory decoded = encoded.decode();

        assertEq(decoded.account, address(0x1234567890123456789012345678901234567890));
        assertEq(decoded.gasLimit, 1000000);
        assertEq(decoded.executeGasLimit, 800000);
        assertEq(decoded.dest, address(0x2345678901234567890123456789012345678901));
        assertEq(decoded.paymaster, address(0x3456789012345678901234567890123456789012));
        assertEq(decoded.value, 1000000000000000000);
        assertEq(decoded.nonce, 1);
        assertEq(decoded.maxFeePerGas, 2000000000);
        assertEq(decoded.submitterFee, 100000000);
        assertEq(
            decoded.callData,
            hex"abcdef123456abcdef123456abcdef123456abcdef123456abcdef123456abcdef123456abcdef123456abcdef123456"
        );
        assertEq(
            decoded.paymasterData,
            hex"789078907890789078907890789078907890789078907890789078907890789078907890789078907890789078907890"
        );
        assertEq(decoded.validatorData, hex"9abc");
        assertEq(decoded.extraData, hex"def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0def0");
    }
}
