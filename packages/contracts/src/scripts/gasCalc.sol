// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/Script.sol";

import {PackedUserOperation} from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {IPaymaster} from "account-abstraction/contracts/interfaces/IPaymaster.sol";

import {GasMeasurementHelper} from "./utils/gasMeasurementHelper.sol";
import {UserOpLib} from "./UserOpLib.sol";
import {ENTRYPOINT_V7_CODE} from "../deploy/initcode/EntryPointV7Code.sol";
import {HappyPaymaster} from "../HappyPaymaster.sol";

address constant ENTRYPOINT_V7 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
uint256 constant DUMMY_REQUIRED_PREFUND = 1e18;

/* solhint-disable no-console*/
contract GasEstimator is Test {
    using UserOpLib for PackedUserOperation;

    bytes32 public constant DEPLOYMENT_SALT = 0;
    address public constant CREATE2_PROXY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    IPaymaster private happyPaymaster;
    GasMeasurementHelper private gasMeasurementHelper;

    function setUp() public {
        if (ENTRYPOINT_V7.code.length == 0) {
            (bool success,) = CREATE2_PROXY.call(ENTRYPOINT_V7_CODE); // solhint-disable-line
            require(success, "Failed to deploy EntryPointV7"); // solhint-disable-line
        }

        address[] memory allowedBundlers = new address[](0);
        happyPaymaster = new HappyPaymaster{salt: DEPLOYMENT_SALT}(ENTRYPOINT_V7, allowedBundlers);

        gasMeasurementHelper = new GasMeasurementHelper();
    }

    function testEstimatePaymasterValidateUserOpGasIsolatedTxns() public {
        // Step 1: Gas cost when storage transitions from zero to non-zero (worst-case scenario)
        PackedUserOperation memory userOp1 = _getUserOp();
        uint256 gasUsedStep1 = _estimatePaymasterValidateUserOpGas(userOp1);
        console.log("Gas used for initial userOp (storage initialization): %d gas", gasUsedStep1);

        // Step 2: Gas cost for a normal UserOp (different sender) (storage has been initialized, but cold)
        PackedUserOperation memory userOp2 = userOp1;
        userOp2.sender = address(0x19Ac95a5524DB39021BA2f10E4F65574DfEd2742);
        uint256 gasUsedStep2 = _estimatePaymasterValidateUserOpGas(userOp2);
        console.log("Gas used for normal userOp (storage initialized, but cold): %d gas", gasUsedStep2);

        // Step 3: Gas cost when validating the same UserOp again (warm storage access)
        PackedUserOperation memory userOp3 = userOp2;
        userOp3.nonce = userOp3.nonce + 1; // Increment nonce to simulate a new operation
        uint256 gasUsedStep3 = _estimatePaymasterValidateUserOpGas(userOp3);
        console.log("Gas used for same UserOp validated again (warm storage access): %d gas", gasUsedStep3);

        // Step 4: Gas cost for a UserOp with larger calldata (10 KB)
        PackedUserOperation memory userOp4 = userOp1;
        userOp4.sender = address(0x19aC95A5524Db39021ba2F10E4F65574DfED2743);
        bytes memory largeCalldata = new bytes(1024 * 10); // 10 KB
        for (uint256 i = 0; i < largeCalldata.length; i++) {
            largeCalldata[i] = bytes1(uint8(i));
        }
        userOp4.callData = largeCalldata;
        uint256 gasUsedStep4 = _estimatePaymasterValidateUserOpGas(userOp4);
        console.log("Gas used for UserOp with large calldata (10 KB): %d gas", gasUsedStep4);
    }

    function testEstimatePaymasterValidateUserOpGasForSameUserOpTwice() public {
        PackedUserOperation memory userOp1 = _getUserOp();
        userOp1.sender = address(0x19AC95a5524db39021ba2f10e4f65574DfED2744);
        PackedUserOperation memory userOp2 = userOp1;
        userOp2.nonce = userOp1.nonce + 1; // Increment nonce to simulate a new operation

        PackedUserOperation[] memory userOps = new PackedUserOperation[](2);
        userOps[0] = userOp1;
        userOps[1] = userOp2;

        uint256[] memory gasUsed = gasMeasurementHelper.measureValidatePaymasterUserOpGas(
            happyPaymaster, userOps, ENTRYPOINT_V7, DUMMY_REQUIRED_PREFUND
        );
        console.log("Gas used for initial userOp (storage initialization): %d gas", gasUsed[0]);
        console.log("Gas used for validating same userOp again (warm storage access): %d gas", gasUsed[1]);
    }

    function testEstimatePaymasterValidateUserOpGasForDifferentSenders() public {
        PackedUserOperation memory userOp1 = _getUserOp();
        userOp1.sender = address(0x19aC95a5524Db39021ba2F10E4f65574dfEd2745);
        PackedUserOperation memory userOp2 = userOp1;
        userOp2.nonce = userOp1.nonce + 1; // Increment nonce to simulate a new operation
        userOp2.sender = address(0x19aC95A5524DB39021Ba2f10e4f65574DFED2746);

        PackedUserOperation[] memory userOps = new PackedUserOperation[](2);
        userOps[0] = userOp1;
        userOps[1] = userOp2;

        uint256[] memory gasUsed = gasMeasurementHelper.measureValidatePaymasterUserOpGas(
            happyPaymaster, userOps, ENTRYPOINT_V7, DUMMY_REQUIRED_PREFUND
        );
        console.log("Gas used for initial userOp (storage initialization): %d gas", gasUsed[0]);
        console.log("Gas used for validating userOp with different sender: %d gas", gasUsed[1]);
    }

    function _estimatePaymasterValidateUserOpGas(PackedUserOperation memory userOp) internal returns (uint256) {
        bytes32 userOpHash = userOp.getEncodedUserOpHash();

        vm.prank(ENTRYPOINT_V7);
        uint256 gasBefore = gasleft();
        happyPaymaster.validatePaymasterUserOp(userOp, userOpHash, DUMMY_REQUIRED_PREFUND);
        uint256 gasAfter = gasleft();

        return gasBefore - gasAfter;
    }

    function _getUserOp() internal pure returns (PackedUserOperation memory) {
        return PackedUserOperation({
            sender: address(0x19AC95A5524dB39021bA2f10e4F65574dfed2741),
            nonce: 1709544157355333882523719095375585908392260257582749875196537894944636929,
            initCode: bytes(
                hex"c5265d5d0000000000000000000000000c97547853926e209d9f3c3fd0b7bdf126d3bf860000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001243c3b752b01F7B2845C4c0cA860D5d60A1332769375d01F7AAD0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000014f39Fd6e51aad88F6F4ce6aB8827279cffFb922660000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000" // solhint-disable-line max-line-length
            ),
            callData: bytes(
                hex"e9ae5c53000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000034613497A7883d2F76b9F397811F5F10c40c7a65c9000000000000000000000000000000000000000000000000002386f26fc10000000000000000000000000000" // solhint-disable-line max-line-length
            ),
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
    }
}
