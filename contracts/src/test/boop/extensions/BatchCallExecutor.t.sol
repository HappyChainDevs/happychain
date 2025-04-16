// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {CallInfo, CallInfoEncoding} from "boop/core/CallInfoEncoding.sol";
import {Encoding} from "boop/core/Encoding.sol";
import {BatchCallExecutor, BATCH_CALL_INFO_KEY, InvalidBatchCallInfo} from "boop/extensions/BatchCallExecutor.sol";
import {Boop, CallStatus, ExecutionOutput} from "boop/interfaces/Types.sol";
import {DeployBoopContracts} from "src/deploy/DeployBoop.s.sol";
import {MockERC20} from "src/mocks/MockERC20.sol";
import {MockRevert} from "src/mocks/MockRevert.sol";
import {BoopTestUtils} from "src/test/boop/Utils.sol";
import {MockHappyAccount} from "src/test/mocks/MockHappyAccount.sol";

contract BatchCallExecutorTest is BoopTestUtils {
    using Encoding for Boop;
    using CallInfoEncoding for bytes;

    // ====================================================================================================
    // CONSTANTS

    bytes32 private constant SALT = 0;
    bytes32 private constant SALT2 = bytes32(uint256(1));
    address private constant ZERO_ADDRESS = address(0);
    uint256 private constant INITIAL_DEPOSIT = 10 ether;

    // ====================================================================================================
    // STATE VARIABLES

    DeployBoopContracts private deployer;

    address private smartAccount;
    address private batchCallExecutor;
    uint256 private privKey;
    uint256 private sessionKey;
    address private publicKey;
    address private owner;
    address private dest;
    address private mockToken;
    address private mockRevert;
    address private mockAccount;

    // ====================================================================================================
    // SETUP

    function setUp() public {
        privKey = uint256(vm.envBytes32("PRIVATE_KEY_LOCAL"));
        owner = vm.addr(privKey);

        // Set up the Deployment Script, and deploy the boop contracts as foundry-account-0
        deployer = new DeployBoopContracts();
        vm.prank(owner);
        deployer.deployForTests();

        entryPoint = deployer.entryPoint();
        smartAccount = deployer.happyAccountFactory().createAccount(SALT, owner);
        dest = deployer.happyAccountFactory().createAccount(SALT2, owner);

        // Fund the smart account
        vm.deal(smartAccount, INITIAL_DEPOSIT);

        // Deploy a mock ERC20 token, and a mock token that always reverts
        mockToken = address(new MockERC20("MockTokenA", "MTA", uint8(18)));
        mockRevert = address(new MockRevert());

        // Deploy the BatchCallExecutor
        batchCallExecutor = address(new BatchCallExecutor());

        // Deploy the MockHappyAccount
        mockAccount = address(new MockHappyAccount());
    }

    // ====================================================================================================
    // EXECUTE TESTS

    function testExecuteSingleCall() public {
        // Create a valid boop with a single call to transfer ETH
        Boop memory boop = getStubBoop(mockAccount, mockToken, mockAccount, new bytes(0));
        bytes memory callData = getMintTokenCallData(dest, TOKEN_MINT_AMOUNT);

        // Create a CallInfo array with a single call
        CallInfo[] memory calls = new CallInfo[](1);
        calls[0] = createCallInfo(mockToken, 0, callData);

        // Add the CallInfo array to the extraData
        boop.extraData = encodeExtensionData(calls);

        vm.prank(mockAccount);
        ExecutionOutput memory output = BatchCallExecutor(batchCallExecutor).execute(boop);

        // Verify execution was successful
        assertEq(uint8(output.status), uint8(CallStatus.SUCCEEDED));
        assertEq(output.revertData, "");
    }

    function testExecuteWithInvalidExtraData() public {
        // Create a valid boop with invalid extraData (missing the BATCH_CALL_INFO_KEY)
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));
        boop.extraData = abi.encodePacked(bytes3(0x123456), uint16(0), new bytes(0)); // Wrong key

        vm.prank(smartAccount);
        ExecutionOutput memory output = BatchCallExecutor(batchCallExecutor).execute(boop);

        // Verify execution failed with the correct error
        assertEq(uint8(output.status), uint8(CallStatus.EXECUTE_REJECTED));
        assertEq(output.revertData, abi.encodeWithSelector(InvalidBatchCallInfo.selector));
    }

    function testExecuteWithInvalidCallInfo() public {
        // Create a valid boop with a single call to transfer ETH
        Boop memory boop = getStubBoop(mockAccount, mockToken, mockAccount, new bytes(0));
        bytes memory callData = getMintTokenCallData(dest, TOKEN_MINT_AMOUNT);

        // Create a CallInfo array with a single call
        CallInfo[] memory calls = new CallInfo[](1);
        calls[0] = createCallInfo(mockToken, 0, callData);

        // Add the CallInfo array to the extraData
        bytes memory extraData = encodeExtensionData(calls);

        // Corrupt the encoded call by reducing the total length of encoded array
        // add(00) -> points to BATCH_CALL_INFO_KEY
        // add(03) -> points to length of callInfoArray
        // add(03) -> points to encodedCallData (length slot)
        // add(32) -> points to encodedCallData (after length), callInfoArray len slot
        // add(32) -> points to first callInfo -> dest
        // add(20) -> points to first callInfo -> value
        // add(32) -> points to first callInfo -> cd Length
        // add(32) -> points to first callInfo -> cd
        assembly {
            mstore(add(extraData, 122), 0x54) // reqd is 0x44 (68)
        }

        boop.extraData = extraData;

        vm.prank(mockAccount);
        ExecutionOutput memory output = BatchCallExecutor(batchCallExecutor).execute(boop);

        // Verify execution failed with the correct error
        assertEq(uint8(output.status), uint8(CallStatus.EXECUTE_REJECTED));
        assertEq(output.revertData, abi.encodeWithSelector(InvalidBatchCallInfo.selector));
    }

    function testExecuteWithCallRevert() public {
        // Create a valid boop with a call that will revert
        Boop memory boop = getStubBoop(mockAccount, dest, mockAccount, new bytes(0));

        // Create a CallInfo array with a call to the MockRevert contract
        CallInfo[] memory calls = new CallInfo[](1);
        calls[0] = createCallInfo(mockRevert, 0, abi.encodeCall(MockRevert.intentionalRevert, ()));

        // Add the CallInfo array to the extraData
        boop.extraData = encodeExtensionData(calls);

        vm.prank(mockAccount);
        ExecutionOutput memory output = BatchCallExecutor(batchCallExecutor).execute(boop);

        // Verify execution reverted with the correct status
        assertEq(uint8(output.status), uint8(CallStatus.CALL_REVERTED));
        assertEq(output.revertData, abi.encodeWithSelector(MockRevert.CustomErrorMockRevert.selector));
    }

    function testExecuteWithMultipleCalls() public {
        // Create a valid boop with multiple calls
        Boop memory boop = getStubBoop(mockAccount, dest, mockAccount, new bytes(0));

        // Create a CallInfo array with multiple calls
        CallInfo[] memory calls = new CallInfo[](2);
        calls[0] = createCallInfo(dest, 0.01 ether, new bytes(0)); // ETH transfer
        calls[1] = createCallInfo(mockToken, 0, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT)); // Token mint

        // Add the CallInfo array to the extraData
        boop.extraData = encodeExtensionData(calls);

        vm.deal(mockAccount, 1 ether);
        vm.prank(mockAccount);
        ExecutionOutput memory output = BatchCallExecutor(batchCallExecutor).execute(boop);

        // Verify execution was successful
        assertEq(uint8(output.status), uint8(CallStatus.SUCCEEDED));
        assertEq(output.revertData, "");
    }

    // ====================================================================================================
    // _EXECUTEBATCH TESTS

    function testExecuteBatchOnlySelf() public {
        // Create a CallInfo array
        CallInfo[] memory calls = new CallInfo[](1);
        calls[0] = createCallInfo(dest, 1 ether, new bytes(0));

        // Call _executeBatch directly (not from the contract itself)
        vm.expectRevert("not called from self");
        BatchCallExecutor(batchCallExecutor)._executeBatch(smartAccount, calls);
    }

    function testExecuteBatchRevertPropagation() public {
        // Create a CallInfo array with a call that will revert
        CallInfo[] memory calls = new CallInfo[](2);
        calls[0] = createCallInfo(dest, 0.01 ether, new bytes(0)); // This will succeed
        calls[1] = createCallInfo(mockRevert, 0, abi.encodeWithSelector(MockRevert.intentionalRevert.selector)); // This will revert

        // Create a boop to test execute (which calls _executeBatch internally)
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));
        boop.extraData = encodeExtensionData(calls);

        vm.deal(mockAccount, 1 ether);
        vm.prank(mockAccount);
        ExecutionOutput memory output = BatchCallExecutor(batchCallExecutor).execute(boop);

        // Verify execution reverted with the correct status and data
        assertEq(uint8(output.status), uint8(CallStatus.CALL_REVERTED));
        assertEq(output.revertData, abi.encodeWithSelector(MockRevert.CustomErrorMockRevert.selector));
    }

    // ====================================================================================================
    // HELPER FUNCTIONS

    /// @dev Creates a CallInfo struct for testing
    function createCallInfo(address _dest, uint256 _value, bytes memory _callData)
        internal
        pure
        returns (CallInfo memory)
    {
        return CallInfo({dest: _dest, value: _value, callData: _callData});
    }

    /// @dev Creates an array of CallInfo structs for testing
    function encodeCallInfoArray(CallInfo[] memory calls) internal pure returns (bytes memory encodedArray) {
        // Calculate the total size needed for the encoded data
        uint256 totalSize = 32; // 32 bytes for the array length
        for (uint256 i = 0; i < calls.length; i++) {
            totalSize += 84 + calls[i].callData.length; // 20 (dest) + 32 (value) + 32 (callData.length) + callData.length
        }

        encodedArray = new bytes(totalSize);
        bytes32 outputPtr;
        assembly {
            mstore(add(encodedArray, 32), mload(calls)) // Store the CallInfoArray length (32 bytes)
            outputPtr := add(encodedArray, 64) // Skip the encodedArray.length and CallInfoArray.length slots
        }

        bytes32 destPtr;
        bytes32 valuePtr;

        // Encode each CallInfo struct
        for (uint256 i = 0; i < calls.length; i++) {
            CallInfo memory callInfo = calls[i];

            // Encode dest (20 bytes)
            assembly {
                destPtr := callInfo
                mcopy(outputPtr, add(destPtr, 12), 20) // Address is left padded by 12 bytes
                outputPtr := add(outputPtr, 20)
            }

            // Encode value (32 bytes)
            assembly {
                valuePtr := add(destPtr, 32)
                mcopy(outputPtr, valuePtr, 32)
                outputPtr := add(outputPtr, 32)
            }

            // Encode callData.length (32 bytes)
            bytes memory callData = callInfo.callData;
            uint256 callDataLen = callData.length;
            assembly {
                mstore(outputPtr, callDataLen)
                outputPtr := add(outputPtr, 32)
            }

            // Encode callData
            if (callDataLen > 0) {
                assembly {
                    mcopy(outputPtr, add(callData, 32), callDataLen)
                    outputPtr := add(outputPtr, callDataLen)
                }
            }
        }
    }

    /// @dev Encodes the CallInfo array for use in the extraData of a boop
    function encodeExtensionData(CallInfo[] memory calls) internal pure returns (bytes memory) {
        bytes memory encodedCalls = encodeCallInfoArray(calls);
        return abi.encodePacked(BATCH_CALL_INFO_KEY, bytes3(uint24(encodedCalls.length)), encodedCalls);
    }
}
