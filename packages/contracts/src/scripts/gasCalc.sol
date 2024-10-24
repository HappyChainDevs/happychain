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
     * 2. Cold storage access by validating the same user operation again.
     * 3. A user operation with larger calldata (round number and double the size).
     * 4. Another userOp by the same user in a single transaction (Warm storage access).
     * 5. Another userOp by different user in a single transaction (Warm storage access).
     */
    function testEstimatePaymasterValidateUserOpGas() public {
        // Step 1: Gas cost when storage transitions from zero to non-zero (worst-case scenario)
        PackedUserOperation memory userOp1 = _getUserOp();
        uint256 gasUninitialized = this._estimatePaymasterValidateUserOpGas(userOp1);

        console.log("1. userOp with paymaster storage initialization: %d gas", gasUninitialized);

        // Step 2: Gas cost for the same sender (different nonce)
        PackedUserOperation memory userOp2 = _getUserOp();
        userOp2.nonce = userOp2.nonce + 1; // Increment nonce to represent a new operation with the same sender
        uint256 gasCold = this._estimatePaymasterValidateUserOpGas(userOp2);

        console.log("2. userOp with cold paymaster storage: %d gas", gasCold);

        // Step 3: Warm storage - Gas cost when the same user submits multiple operations within a single transaction
        PackedUserOperation memory userOpWarm1 = _getUserOp();
        userOpWarm1.sender = address(0x19AC95a5524db39021ba2f10e4f65574DfED2744);
        PackedUserOperation memory userOpWarm2 = _getUserOp();
        userOpWarm2.sender = address(0x19AC95a5524db39021ba2f10e4f65574DfED2744);
        userOpWarm2.nonce = userOpWarm2.nonce + 1; // Increment nonce to simulate a new operation

        PackedUserOperation[] memory userOpsWarmSame = new PackedUserOperation[](2);
        userOpsWarmSame[0] = userOpWarm1;
        userOpsWarmSame[1] = userOpWarm2;
        uint256[] memory gasUsedWarmSame = this._estimatePaymasterValidateUserOpGasForMultipleOps(userOpsWarmSame);

        console.log("3. userOp with warm paymaster storage: %d gas", gasUsedWarmSame[1]);

        // Step 4: Warm storage - Gas cost when different users submit operations within a single transaction
        PackedUserOperation memory userOpWarmDiff1 = _getUserOp();
        userOpWarmDiff1.sender = address(0x19aC95a5524Db39021ba2F10E4f65574dfEd2745);
        PackedUserOperation memory userOpWarmDiff2 = _getUserOp();
        userOpWarmDiff2.nonce = userOpWarmDiff2.nonce + 1; // Increment nonce to simulate a new operation
        userOpWarmDiff2.sender = address(0x19aC95A5524DB39021Ba2f10e4f65574DFED2746);

        this._estimatePaymasterValidateUserOpGas(userOpWarmDiff2); // Initialize the userInfo Slot beforehand

        PackedUserOperation[] memory userOpsWarmDiff = new PackedUserOperation[](2);
        userOpsWarmDiff[0] = userOpWarmDiff1;
        userOpsWarmDiff[1] = userOpWarmDiff2;
        uint256[] memory gasUsedWarmDiff = this._estimatePaymasterValidateUserOpGasForMultipleOps(userOpsWarmDiff);

        console.log(
            "4. discount for a cold userOp that isn't the first one in the bundle: %d gas", gasCold - gasUsedWarmDiff[1]
        );

        // Step 5: Gas cost for a UserOp with larger calldata (round number and double that)
        PackedUserOperation memory userOp5 = _getUserOp();
        userOp5.sender = address(0x19ac95A5524Db39021Ba2F10E4F65574DFED2750);
        userOp5.callData = _createCalldata(256);
        uint256 gasForBaseCalldata = this._estimatePaymasterValidateUserOpGas(userOp5);

        userOp5.sender = address(0x19ac95A5524db39021ba2F10E4F65574dFed2751);
        userOp5.callData = _createCalldata(512);
        uint256 gasForDoubleCalldata = this._estimatePaymasterValidateUserOpGas(userOp5);

        console.log(
            "5. overhead when doubling the calldata size (512 bytes vs 256 bytes): %d gas",
            gasForDoubleCalldata - gasForBaseCalldata
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
            initCode: bytes(""),
            callData: _createCalldata(256),
            accountGasLimits: bytes32(0x0000000000000000000000000002474700000000000000000000000000024f0b),
            preVerificationGas: 55378,
            gasFees: bytes32(0x0000000000000000000000003b9aca000000000000000000000000003b9deb7c),
            paymasterAndData: bytes(
                // solhint-disable-next-line max-line-length
                hex"a33009b1552a751929b7e240aaa62b2640782fbc0000000000000000000000000000bbb800000000000000000000000000000001"
            ),
            signature: bytes(
                // solhint-disable-next-line max-line-length
                hex"7cfc78c01ec5ea50208d14fb1ee865569e015da08c27807575d70bf66041ffe335fe5e4e0dbcce07fddf357e4584b9e6de77ca13806d2d715ade184ba4bc15fc1b"
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
