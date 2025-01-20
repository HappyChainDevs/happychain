// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

// solhint-disable no-console 

import {Test, console} from "forge-std/Test.sol";

import {HappyTx} from "../core/HappyTx.sol";
import {HappyTxLib} from "../libs/HappyTxLib.sol";

contract HappyTxLibTest is Test {
    using HappyTxLib for bytes;

    function testDecodeEmptyDynamicData() public pure {
        bytes memory encoded =
             hex"123456789012345678901234567890123456789023456789012345678901234534567890123456789012345678901234567890126789012345678901000f42400000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000773594000000000000000000000000000000000000000000000000000000000005f5e10000000000000000020000000002000000000000000000000000000000000c35001234"; // solhint-disable-line max-line-length

        // Now try to decode
        HappyTx memory decoded = encoded.decode();

        // Log the decoded struct
        console.log("\n=== Decoded Result ===");
        console.log("account:", decoded.account);
        console.log("gasLimit:", decoded.gasLimit);
        console.log("executeGasLimit:", decoded.executeGasLimit);
        console.log("dest:", decoded.dest);
        console.log("paymaster:", decoded.paymaster);
        console.log("value:", decoded.value);
        console.log("nonce:", decoded.nonce);
        console.log("maxFeePerGas:", decoded.maxFeePerGas);
        console.log("submitterFee:", decoded.submitterFee);
        console.log("callData:", vm.toString(decoded.callData));
        console.log("paymasterData:", vm.toString(decoded.paymasterData));
        console.log("validatorData:", vm.toString(decoded.validatorData));
        console.log("extraData:", vm.toString(decoded.extraData));
        console.log("=== End Result ===\n");

        // Now do the assertions
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

    function testDecodeWithAllFields() public pure {
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
}
