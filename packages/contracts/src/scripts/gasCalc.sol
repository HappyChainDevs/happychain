// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Script, console} from "forge-std/Script.sol";

import {PackedUserOperation} from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {IPaymaster} from "account-abstraction/contracts/interfaces/IPaymaster.sol";

import {UserOpLib} from "./UserOpLib.sol";

contract GasEstimator is Test, Script {
    address public constant ENTRYPOINT_V7 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
    address public constant HAPPY_PAYMASTER = 0x27cdcC529A98DCFDa7FF10329a3635D886F80e78;
    IPaymaster private happyPaymaster;

    PackedUserOperation[] public userOps;

    function setUp() public {
        happyPaymaster = IPaymaster(HAPPY_PAYMASTER);
        populateUserOps();
    }

    function populateUserOps() public {
        PackedUserOperation[] memory tempUserOps = createSampleUserOps();
        for (uint256 i = 0; i < tempUserOps.length; i++) {
            userOps.push(tempUserOps[i]);
        }
    }

    function run() public {
        testestimatePaymasterValidateUserOpGas();
    }

    function testestimatePaymasterValidateUserOpGas() public {
        uint256 totalGas = 0;
        uint256 numEstimates = userOps.length;

        for (uint256 i = 0; i < numEstimates; i++) {
            uint256 gasUsed = _estimateSinglePaymasterGas(userOps[i]);
            totalGas += gasUsed;
            console.log("Gas used for UserOp %d: %d", i, gasUsed); // solhint-disable-line no-console
        }

        uint256 averageGas = totalGas / numEstimates;
        console.log("Average gas used: %d", averageGas); // solhint-disable-line no-console
    }

    function _estimateSinglePaymasterGas(PackedUserOperation memory userOp) internal returns (uint256) {
        bytes32 userOpHash = UserOpLib.getEncodedUserOpHash(userOp);
        uint256 requiredPrefund = 1e18; // Dummy Value

        uint256 gasBefore = gasleft();

        vm.prank(ENTRYPOINT_V7);
        happyPaymaster.validatePaymasterUserOp(userOp, userOpHash, requiredPrefund);

        uint256 gasAfter = gasleft();
        return gasBefore - gasAfter;
    }

    function createSampleUserOps() internal pure returns (PackedUserOperation[] memory) {
        PackedUserOperation[] memory userOpsArray = new PackedUserOperation[](5);

        userOpsArray[0] = PackedUserOperation({
            sender: address(0x19AC95A5524dB39021bA2f10e4F65574dfed2741),
            nonce: 1709544157355333882523719095375585908392260257582749875196537894944636929,
            initCode: hex"",
            callData: hex"",
            accountGasLimits: bytes32(0x0000000000000000000000000002474700000000000000000000000000024f0b),
            preVerificationGas: 55378,
            gasFees: bytes32(0x0000000000000000000000003b9aca000000000000000000000000003b9deb7c),
            paymasterAndData: bytes(
                hex"a33009b1552a751929b7e240aaa62b2640782fbc0000000000000000000000000000bbb800000000000000000000000000000001" // solhint-disable-line max-line-length
            ),
            signature: bytes(
                hex"7cfc78c01ec5ea50208d14fb1ee865569e015da08c27807575d70bf66041ffe335fe5e4e0dbcce07fddf357e4584b9e6de77ca13806d2d715ade184ba4bc15fc1b" // solhint-disable-line max-line-length
            )
        });

        userOpsArray[1] = PackedUserOperation({
            sender: address(0x19AC95A5524dB39021bA2f10e4F65574dfed2741),
            nonce: 1,
            initCode: bytes(
                hex"c5265d5d0000000000000000000000000c97547853926e209d9f3c3fd0b7bdf126d3bf860000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001243c3b752b01F7B2845C4c0cA860D5d60A1332769375d01F7AAD0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000014f39Fd6e51aad88F6F4ce6aB8827279cffFb922660000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" // solhint-disable-line max-line-length
            ),
            callData: hex"",
            accountGasLimits: bytes32(0x0000000000000000000000000001e84800000000000000000000000000030d40),
            preVerificationGas: 50000,
            gasFees: bytes32(0x00000000000000000000000004a817c800000000000000000000000004a817c8),
            paymasterAndData: bytes(
                hex"a33009b1552a751929b7e240aaa62b2640782fbc0000000000000000000000000000bbb800000000000000000000000000000001" // solhint-disable-line max-line-length
            ),
            signature: bytes(hex"abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef")
        });

        userOpsArray[2] = PackedUserOperation({
            sender: address(0x19AC95A5524dB39021bA2f10e4F65574dfed2741),
            nonce: 2,
            initCode: hex"",
            callData: bytes(
                hex"e9ae5c53000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000034613497A7883d2F76b9F397811F5F10c40c7a65c9000000000000000000000000000000000000000000000000002386f26fc10000000000000000000000000000" // solhint-disable-line max-line-length
            ),
            accountGasLimits: bytes32(0x0000000000000000000000000002dc6c000000000000000000000000000493e0),
            preVerificationGas: 60000,
            gasFees: bytes32(0x000000000000000000000000059682f0000000000000000000000000059682f0),
            paymasterAndData: bytes(
                hex"a33009b1552a751929b7e240aaa62b2640782fbc0000000000000000000000000000bbb800000000000000000000000000000001" // solhint-disable-line max-line-length
            ),
            signature: bytes(hex"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")
        });

        userOpsArray[3] = PackedUserOperation({
            sender: address(0x19AC95A5524dB39021bA2f10e4F65574dfed2741),
            nonce: 3,
            initCode: bytes(
                hex"c5265d5d0000000000000000000000000c97547853926e209d9f3c3fd0b7bdf126d3bf860000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001243c3b752b01F7B2845C4c0cA860D5d60A1332769375d01F7AAD0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000014f39Fd6e51aad88F6F4ce6aB8827279cffFb922660000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" // solhint-disable-line max-line-length
            ),
            callData: bytes(
                hex"e9ae5c53000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000034613497A7883d2F76b9F397811F5F10c40c7a65c9000000000000000000000000000000000000000000000000002386f26fc10000000000000000000000000000" // solhint-disable-line max-line-length
            ),
            accountGasLimits: bytes32(0x0000000000000000000000000003d090000000000000000000000000005dc0aa),
            preVerificationGas: 70000,
            gasFees: bytes32(0x00000000000000000000000006fc23ac00000000000000000000000006fc23ac),
            paymasterAndData: bytes(
                hex"0badc0de0badc0de0badc0de0badc0de0badc0de0000000000000000000000000009c40000000000000000000000000000000401" // solhint-disable-line max-line-length
            ),
            signature: bytes(hex"fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210")
        });

        userOpsArray[4] = PackedUserOperation({
            sender: address(0x19AC95A5524dB39021bA2f10e4F65574dfed2741),
            nonce: 4,
            initCode: hex"",
            callData: hex"",
            accountGasLimits: bytes32(0x0000000000000000000000000004c4b40000000000000000000000000007a120),
            preVerificationGas: 80000,
            gasFees: bytes32(0x00000000000000000000000007a120000000000000000000000000007a120000),
            paymasterAndData: bytes(
                hex"baddcafebaddcafebaddcafebaddcafebaddcafe000000000000000000000000000bb80000000000000000000000000000000502" // solhint-disable-line max-line-length
            ),
            signature: bytes(hex"cafebabecafebabecafebabecafebabecafebabecafebabecafebabecafebabe")
        });

        return userOpsArray;
    }
}
