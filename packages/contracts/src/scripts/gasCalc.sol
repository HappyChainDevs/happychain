// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/Script.sol";

import {PackedUserOperation} from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {IPaymaster} from "account-abstraction/contracts/interfaces/IPaymaster.sol";

import {UserOpLib} from "./UserOpLib.sol";
import {HappyPaymaster} from "../HappyPaymaster.sol";
import {ENTRYPOINT_V7_CODE} from "../deploy/initcode/EntryPointV7Code.sol";

/* solhint-disable no-console*/
contract GasEstimator is Test {
    using UserOpLib for PackedUserOperation;

    bytes32 private constant DEPLOYMENT_SALT = 0;
    address private constant CREATE2_PROXY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    address private constant ENTRYPOINT_V7 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
    address private constant ALLOWED_BUNDLER = 0x0000000000000000000000000000000000000001;
    uint256 private constant DUMMY_REQUIRED_PREFUND = 1e18;

    IPaymaster private happyPaymaster;

    function setUp() public {
        if (ENTRYPOINT_V7.code.length == 0) {
            (bool success,) = CREATE2_PROXY.call(ENTRYPOINT_V7_CODE); // solhint-disable-line
            require(success, "Failed to deploy EntryPointV7"); // solhint-disable-line
        }

        address[] memory allowedBundlers = new address[](1);
        allowedBundlers[0] = ALLOWED_BUNDLER;
        happyPaymaster = new HappyPaymaster{salt: DEPLOYMENT_SALT}(ENTRYPOINT_V7, allowedBundlers);
    }

    /**
     * @notice Measures gas usage for various user operations, including:
     * 1. Cold storage access in isolated transactions.
     * 2. Warm storage access by the same user within a single transaction.
     * 3. Warm storage access by different users within a single transaction.
     *
     * This test estimates gas consumption for:
     * 1. Initial storage initialization (cold storage).
     * 2. Cold storage access with a different sender.
     * 3. Cold storage access by validating the same user operation again.
     * 4. A user operation with larger calldata (round number and double the size).
     * 5. Another userOp by the same user in a single transaction (Warm storage access).
     * 6. Another userOp by different user in a single transaction (Warm storage access).
     */
    function testEstimatePaymasterValidateUserOpGas() public {
        // Step 1: Gas cost when storage transitions from zero to non-zero (worst-case scenario)
        PackedUserOperation memory userOp1 = _getUserOp();
        uint256 gasForStorageInitialization = this._estimatePaymasterValidateUserOpGas(userOp1);

        // Step 2: Gas cost for a different sender (cold storage access)
        PackedUserOperation memory userOp2 = userOp1;
        userOp2.sender = address(0x19Ac95a5524DB39021BA2f10E4F65574DfEd2742);
        uint256 gasForDifferentSender = this._estimatePaymasterValidateUserOpGas(userOp2);

        // Step 3: Gas cost for the same sender (different nonce)
        PackedUserOperation memory userOp3 = userOp2;
        userOp3.nonce = userOp3.nonce + 1; // Increment nonce to represent a new operation with the same sender
        uint256 gasForSameSender = this._estimatePaymasterValidateUserOpGas(userOp3);

        // Step 4: Gas cost for a UserOp with larger calldata (round number and double that)
        PackedUserOperation memory userOp4 = _getUserOp();
        userOp4.sender = address(0x19ac95A5524Db39021Ba2F10E4F65574DFED2750);
        userOp4.callData = _createCalldata(256);
        uint256 gasForBaseCalldata = this._estimatePaymasterValidateUserOpGas(userOp4);

        userOp4.sender = address(0x19ac95A5524db39021ba2F10E4F65574dFed2751);
        userOp4.callData = _createCalldata(512);
        uint256 gasForDoubleCalldata = this._estimatePaymasterValidateUserOpGas(userOp4);

        console.log("Gas Report for Cold Storage Operations:");
        console.log("  1. Initial userOp (storage initialization): %d gas", gasForStorageInitialization);
        console.log("  2. Normal userOp with a different sender: %d gas", gasForDifferentSender);
        console.log("  3. Same userOp with the same sender: %d gas", gasForSameSender);
        console.log(
            "  4. Doubling calldata size (512 bytes vs 256 bytes): %d gas", gasForDoubleCalldata - gasForBaseCalldata
        );

        // Step 5: Warm storage - Gas cost when the same user submits multiple operations within a single transaction
        PackedUserOperation memory userOpWarm1 = _getUserOp();
        userOpWarm1.sender = address(0x19AC95a5524db39021ba2f10e4f65574DfED2744);
        PackedUserOperation memory userOpWarm2 = _getUserOp();
        userOpWarm2.sender = address(0x19AC95a5524db39021ba2f10e4f65574DfED2744);
        userOpWarm2.nonce = userOpWarm2.nonce + 1; // Increment nonce to simulate a new operation

        PackedUserOperation[] memory userOpsWarmSame = new PackedUserOperation[](2);
        userOpsWarmSame[0] = userOpWarm1;
        userOpsWarmSame[1] = userOpWarm2;
        uint256[] memory gasUsedWarmSame = this._estimatePaymasterValidateUserOpGasForMultipleOps(userOpsWarmSame);

        // Step 6: Warm storage - Gas cost when different users submit operations within a single transaction
        PackedUserOperation memory userOpWarmDiff1 = _getUserOp();
        userOpWarmDiff1.sender = address(0x19aC95a5524Db39021ba2F10E4f65574dfEd2745);
        PackedUserOperation memory userOpWarmDiff2 = _getUserOp();
        userOpWarmDiff2.nonce = userOpWarmDiff2.nonce + 1; // Increment nonce to simulate a new operation
        userOpWarmDiff2.sender = address(0x19aC95A5524DB39021Ba2f10e4f65574DFED2746);

        PackedUserOperation[] memory userOpsWarmDiff = new PackedUserOperation[](2);
        userOpsWarmDiff[0] = userOpWarmDiff1;
        userOpsWarmDiff[1] = userOpWarmDiff2;
        uint256[] memory gasUsedWarmDiff = this._estimatePaymasterValidateUserOpGasForMultipleOps(userOpsWarmDiff);

        console.log("Gas Report for Warm Storage Operations:");
        console.log(
            "  5. Validating another userOp from the same sender in same transaction (warm storage access): %d gas",
            gasUsedWarmSame[1]
        );
        console.log(
            "  6. Validating another userOp from different sender in same transaction (warm storage access): %d gas",
            gasUsedWarmDiff[1]
        );
    }

    /**
     * @notice Measures gas usage for validating multiple user operations within a single transaction.
     *
     * By executing multiple validations in the same transaction, this function simulates warm storage access
     * ensuring that storage slots remain warm between calls. This allows us to measure the gas savings
     * from using already-initialized storage (warm storage).
     *
     * @param userOps An array of `PackedUserOperation` to validate.
     * @return gasUsedArray An array of gas used for each user operation validation.
     */
    function _estimatePaymasterValidateUserOpGasForMultipleOps(PackedUserOperation[] memory userOps)
        external
        returns (uint256[] memory)
    {
        uint256[] memory gasUsedArray = new uint256[](userOps.length);

        for (uint256 i = 0; i < userOps.length; i++) {
            PackedUserOperation memory userOp = userOps[i];
            bytes32 userOpHash = userOp.getEncodedUserOpHash();

            vm.prank(ENTRYPOINT_V7, ALLOWED_BUNDLER);
            uint256 gasBefore = gasleft();
            happyPaymaster.validatePaymasterUserOp(userOp, userOpHash, DUMMY_REQUIRED_PREFUND);
            uint256 gasAfter = gasleft();

            gasUsedArray[i] = gasBefore - gasAfter;
        }

        return gasUsedArray;
    }

    /**
     * @dev Internal function to estimate gas used by `validatePaymasterUserOp` for a single user operation.
     *      This function is used when each call is executed as a separate transaction (due to `--isolate` flag).
     */
    function _estimatePaymasterValidateUserOpGas(PackedUserOperation memory userOp) external returns (uint256) {
        bytes32 userOpHash = userOp.getEncodedUserOpHash();

        vm.prank(ENTRYPOINT_V7, ALLOWED_BUNDLER);
        uint256 gasBefore = gasleft();
        happyPaymaster.validatePaymasterUserOp(userOp, userOpHash, DUMMY_REQUIRED_PREFUND);
        uint256 gasAfter = gasleft();

        return gasBefore - gasAfter;
    }

    /**
     * @dev Internal helper function to create a simple `PackedUserOperation`.
     *      The values are hardcoded for testing purposes. The effect of this
     *      userOp is irrelevant since we're only testing the paymaster validation logic.
     */
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

    function _createCalldata(uint256 size) internal pure returns (bytes memory) {
        bytes memory calldataBytes = new bytes(size);
        for (uint256 i = 0; i < size; i++) {
            calldataBytes[i] = bytes1(uint8(i));
        }
        return calldataBytes;
    }
}
