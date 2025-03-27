// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CallInfo, CallInfoCodingLib} from "boop/libs/CallInfoCodingLib.sol";

contract CallInfoCodingLibTest is Test {
    using CallInfoCodingLib for bytes;

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
}
