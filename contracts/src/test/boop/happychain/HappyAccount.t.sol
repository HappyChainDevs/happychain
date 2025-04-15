// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Encoding} from "boop/core/Encoding.sol";
import {HappyAccount} from "boop/happychain/HappyAccount.sol";
import {IAccount} from "boop/interfaces/IAccount.sol";
import {IExtensibleAccount} from "boop/interfaces/IExtensibleAccount.sol";
import {VALIDATOR_KEY} from "boop/interfaces/ICustomValidator.sol";
import {EXECUTOR_KEY} from "boop/interfaces/ICustomExecutor.sol";
import {Boop, CallInfo, CallStatus, ExecutionOutput, ExtensionType} from "boop/interfaces/Types.sol";
import {
    InvalidSignature,
    NotFromEntryPoint,
    UnknownDuringSimulation,
    ExtensionAlreadyRegistered,
    ExtensionNotRegistered,
    InvalidExtensionValue
} from "boop/interfaces/EventsAndErrors.sol";
import {IAccount} from "boop/interfaces/IAccount.sol";
import {EXECUTOR_KEY} from "boop/interfaces/ICustomExecutor.sol";
import {VALIDATOR_KEY} from "boop/interfaces/ICustomValidator.sol";
import {Boop, CallInfo, CallStatus, ExecutionOutput, ExtensionType} from "boop/interfaces/Types.sol";
import {DeployBoopContracts} from "./../../../deploy/DeployBoop.s.sol";
import {MockERC20} from "./../../../mocks/MockERC20.sol";
import {MockRevert} from "./../../../mocks/MockRevert.sol";
import {MockExecutor} from "./../../../test/mocks/MockExecutor.sol";
import {MockValidator} from "./../../../test/mocks/MockValidator.sol";
import {BoopTestUtils} from "./../Utils.sol";

contract HappyAccountTest is BoopTestUtils {
    using Encoding for Boop;

    // ====================================================================================================
    // CONSTANTS

    bytes32 private constant SALT = 0;
    bytes32 private constant SALT2 = bytes32(uint256(1));
    address private constant ZERO_ADDRESS = address(0);
    uint256 private constant INITIAL_DEPOSIT = 10 ether;
    uint256 private constant DUMMY_PRIV_KEY =
        uint256(bytes32(0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef));

    // ====================================================================================================
    // STATE VARIABLES

    DeployBoopContracts private deployer;

    address private _entryPoint;
    address private smartAccount;
    address private mockValidator;
    address private mockExecutor;
    address private mockToken;
    address private mockRevert;
    uint256 private privKey;
    address private owner;
    address private dest;

    function setUp() public {
        privKey = uint256(vm.envBytes32("PRIVATE_KEY_LOCAL"));
        owner = vm.addr(privKey);

        // Set up the Deployment Script, and deploy the boop contracts as foundry-account-0
        deployer = new DeployBoopContracts();
        vm.prank(owner);
        deployer.deployForTests();

        entryPoint = deployer.entryPoint();
        _entryPoint = address(entryPoint);
        smartAccount = deployer.happyAccountFactory().createAccount(SALT, owner);

        dest = deployer.happyAccountFactory().createAccount(SALT2, owner);

        // Fund the smart account
        vm.deal(smartAccount, INITIAL_DEPOSIT);

        // Deploy a mock ERC20 token, and a mock token that always reverts
        mockToken = address(new MockERC20("MockTokenA", "MTA", uint8(18)));
        mockRevert = address(new MockRevert());

        // Deploy a mock validator
        mockValidator = address(new MockValidator());

        // Deploy a mock executor
        mockExecutor = address(new MockExecutor());
    }

    // ====================================================================================================
    // SIGNATURE VALIDATION TESTS

    function testValidateEmptySignature() public {
        // Create a boop with an empty signature
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));

        // Validate function must be called by the EntryPoint
        vm.prank(_entryPoint);

        // The function should revert with ValidationReverted(InvalidSignature.selector)
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InvalidSignature()"))));

        HappyAccount(payable(smartAccount)).validate(boop);
    }

    function testValidateInvalidSignatureLength() public {
        // Create a boop with a signature of invalid length
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));
        boop.validatorData = hex"deadbeef";

        // Validate function must be called by the EntryPoint
        vm.prank(_entryPoint);

        // The function should revert with ValidationReverted(InvalidSignature.selector)
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InvalidSignature()"))));

        HappyAccount(payable(smartAccount)).validate(boop);
    }

    function testValidateInvalidSignature() public {
        // Create a boop with a dummy signature of length 65 bytes
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));
        boop.validatorData =
            hex"deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefde";

        // Validate function must be called by the EntryPoint
        vm.prank(_entryPoint);

        // The function should revert with ValidationReverted(InvalidSignature.selector)
        vm.expectRevert(abi.encodeWithSelector(InvalidSignature.selector));

        HappyAccount(payable(smartAccount)).validate(boop);
    }

    function testValidateInvalidOwnerSignature() public {
        // Create a boop with a signature from a different owner
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));
        boop.validatorData = signBoop(boop, DUMMY_PRIV_KEY);

        // Validate function must be called by the EntryPoint
        vm.prank(_entryPoint);

        bytes memory validationData = HappyAccount(payable(smartAccount)).validate(boop);
        assertEq(validationData, abi.encodeWithSelector(InvalidSignature.selector));
    }

    // ====================================================================================================
    // SIGNATURE VALIDATION TESTS (SIMULATION)

    function testSimulationValidateUnknownDuringSimulation() public {
        // Create a boop with a signature from a different owner
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));
        boop.validatorData = signBoop(boop, DUMMY_PRIV_KEY);

        // Validate function must be called by the EntryPoint, with tx.origin = address(0)
        vm.prank(_entryPoint, ZERO_ADDRESS);

        bytes memory validationData = HappyAccount(payable(smartAccount)).validate(boop);
        assertEq(validationData, abi.encodeWithSelector(UnknownDuringSimulation.selector));
    }

    // ====================================================================================================
    // VALIDATION TESTS (EXTENSIONS)

    function testValidateWithInvalidExtensionValue() public {
        // Create a boop with invalid validator address in extraData (not 20 bytes)
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));

        // Create invalid validator address (less than 20 bytes)
        bytes memory invalidValidatorAddress = "deadbeefdeadbeefde";

        // Add the invalid validator address to extraData with VALIDATOR_KEY
        boop.extraData = encodeExtensionData(VALIDATOR_KEY, 0x000010, invalidValidatorAddress);

        // Call validate as the entry point
        vm.prank(_entryPoint);
        bytes memory result = HappyAccount(payable(smartAccount)).validate(boop);

        // Should return InvalidExtensionValue selector
        assertEq(result, abi.encodeWithSelector(InvalidExtensionValue.selector));
    }

    function testValidateWithUnregisteredExtension() public {
        // Create a boop with unregistered validator address in extraData
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));

        // Create a validator address that is not registered
        address unregisteredValidator = address(0xDEAD);

        // Add the unregistered validator address to extraData with VALIDATOR_KEY
        boop.extraData = encodeExtensionData(VALIDATOR_KEY, 0x000014, abi.encodePacked(unregisteredValidator));

        // Call validate as the entry point
        vm.prank(_entryPoint);
        bytes memory result = HappyAccount(payable(smartAccount)).validate(boop);

        // Should return ExtensionNotRegistered selector
        assertEq(result, abi.encodeWithSelector(ExtensionNotRegistered.selector));
    }

    function testValidateWithMockValidatorApprove() public {
        // Register the MockValidator as a validator extension
        _setupMockValidator(mockValidator);

        // Create a boop with the MockValidator address in extraData
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));

        // Add the MockValidator address to extraData with VALIDATOR_KEY
        boop.extraData = encodeExtensionData(VALIDATOR_KEY, 0x000014, abi.encodePacked(mockValidator));

        // Call validate as the entry point
        vm.prank(_entryPoint);
        bytes memory result = HappyAccount(payable(smartAccount)).validate(boop);

        // Should return empty bytes (approved)
        assertEq(result, "");
    }

    function testValidateWithMockValidatorReject() public {
        // Set validation mode to Reject
        MockValidator(mockValidator).setValidationMode(1);

        // Register the MockValidator as a validator extension
        _setupMockValidator(mockValidator);

        // Create a boop with the MockValidator address in extraData
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));

        // Add the MockValidator address to extraData with VALIDATOR_KEY
        boop.extraData = encodeExtensionData(VALIDATOR_KEY, 0x000014, abi.encodePacked(mockValidator));

        // Call validate as the entry point
        vm.prank(_entryPoint);
        bytes memory result = HappyAccount(payable(smartAccount)).validate(boop);

        // Should return ValidationRejected selector
        assertEq(result, abi.encodeWithSelector(MockValidator.ValidationRejected.selector));
    }

    function testValidateWithMockValidatorRevert() public {
        // Set validation mode to Revert
        MockValidator(mockValidator).setValidationMode(2);

        // Register the MockValidator as a validator extension
        _setupMockValidator(mockValidator);

        // Create a boop with the MockValidator address in extraData
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));

        // Add the MockValidator address to extraData with VALIDATOR_KEY
        boop.extraData = encodeExtensionData(VALIDATOR_KEY, 0x000014, abi.encodePacked(mockValidator));

        // Call validate as the entry point
        vm.prank(_entryPoint);

        // The validator should revert
        vm.expectRevert(abi.encodeWithSelector(MockValidator.CustomErrorMockRevert.selector));
        HappyAccount(payable(smartAccount)).validate(boop);
    }

    function testValidateWithMockValidatorEmptyRevert() public {
        // Set validation mode to Empty Revert
        MockValidator(mockValidator).setValidationMode(3);

        // Register the MockValidator as a validator extension
        _setupMockValidator(mockValidator);

        // Create a boop with the MockValidator address in extraData
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));

        // Add the MockValidator address to extraData with VALIDATOR_KEY
        boop.extraData = encodeExtensionData(VALIDATOR_KEY, 0x000014, abi.encodePacked(mockValidator));

        // Call validate as the entry point
        vm.prank(_entryPoint);

        // The validator should revert
        vm.expectRevert();
        HappyAccount(payable(smartAccount)).validate(boop);
    }

    // ====================================================================================================
    // EXECUTION TESTS

    function testExecuteMintToken() public {
        uint256 initialTokenBalance = getTokenBalance(mockToken, dest);

        // Create a valid boop for minting mock tokens
        Boop memory boop = createSignedBoopForMintToken(smartAccount, dest, smartAccount, mockToken, privKey);

        // Execute the transaction
        vm.prank(_entryPoint);
        ExecutionOutput memory output = HappyAccount(payable(smartAccount)).execute(boop);

        assertTrue(output.status == CallStatus.SUCCEEDED);
        assertEq(output.revertData, new bytes(0));

        uint256 finalTokenBalance = getTokenBalance(mockToken, dest);
        assertEq(finalTokenBalance, initialTokenBalance + TOKEN_MINT_AMOUNT);
    }

    function testExecuteEthTransfer() public {
        uint256 initialBalance = getEthBalance(dest);

        // Create a valid boop for transferring ETH
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));
        boop.value = 1 ether;
        boop.validatorData = signBoop(boop, privKey);

        // Execute the transaction
        vm.prank(_entryPoint);
        ExecutionOutput memory output = HappyAccount(payable(smartAccount)).execute(boop);

        assertTrue(output.status == CallStatus.SUCCEEDED);
        assertEq(output.revertData, new bytes(0));

        uint256 finalBalance = getEthBalance(dest);
        assertEq(finalBalance, initialBalance + boop.value);
    }

    function testExecuteInnerCallFails() public {
        uint256 initialTokenBalance = getTokenBalance(mockToken, dest);

        // Create a boop with wrong token address, so the call reverts
        Boop memory boop = createSignedBoopForMintToken(smartAccount, dest, smartAccount, dest, privKey);

        // Execute the transaction
        vm.prank(_entryPoint);
        ExecutionOutput memory output = HappyAccount(payable(smartAccount)).execute(boop);

        assertTrue(output.status == CallStatus.CALL_REVERTED);
        assertEq(output.revertData, new bytes(0));

        uint256 finalTokenBalance = getTokenBalance(mockToken, dest);
        assertEq(finalTokenBalance, initialTokenBalance);
    }

    // ====================================================================================================
    // EXECUTION TESTS (EXTENSIONS)

    function testExecuteWithInvalidExtensionValue() public {
        // Create a boop with invalid executor address in extraData (not 20 bytes)
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));

        // Create invalid executor address (less than 20 bytes)
        bytes memory invalidExecutorAddress = "deadbeefdeadbeefde";

        // Add the invalid executor address to extraData with EXECUTOR_KEY
        boop.extraData = encodeExtensionData(EXECUTOR_KEY, 0x000010, invalidExecutorAddress);

        // Call execute as the entry point
        vm.prank(_entryPoint);
        ExecutionOutput memory output = HappyAccount(payable(smartAccount)).execute(boop);

        // Should return EXECUTE_REJECTED with InvalidExtensionValue selector
        assertEq(uint8(output.status), uint8(CallStatus.EXECUTE_REJECTED));
        assertEq(output.revertData, abi.encodeWithSelector(InvalidExtensionValue.selector));
    }

    function testExecuteWithUnregisteredExtension() public {
        // Create a boop with unregistered executor address in extraData
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));

        // Create an executor address that is not registered
        address unregisteredExecutor = address(0xDEAD);

        // Add the unregistered executor address to extraData with EXECUTOR_KEY
        boop.extraData = encodeExtensionData(EXECUTOR_KEY, 0x000014, abi.encodePacked(unregisteredExecutor));

        // Call execute as the entry point
        vm.prank(_entryPoint);
        ExecutionOutput memory output = HappyAccount(payable(smartAccount)).execute(boop);

        // Should return EXECUTE_REJECTED with ExtensionNotRegistered selector
        assertEq(uint8(output.status), uint8(CallStatus.EXECUTE_REJECTED));
        assertEq(output.revertData, abi.encodeWithSelector(ExtensionNotRegistered.selector));
    }

    function testExecuteWithMockExecutorSuccess() public {
        // Register the MockExecutor as an executor extension
        _setupMockExecutor(mockExecutor);

        // Fund the smart account
        vm.deal(smartAccount, 1 ether);

        // Set up a recipient for ETH transfer
        address recipient = address(0xBEEF);
        uint256 transferAmount = 0.1 ether;
        uint256 initialBalance = recipient.balance;

        // Create a boop with the MockExecutor address in extraData
        Boop memory boop = getStubBoop(smartAccount, recipient, smartAccount, new bytes(0));
        boop.value = transferAmount;

        // Add the MockExecutor address to extraData with EXECUTOR_KEY
        boop.extraData = encodeExtensionData(EXECUTOR_KEY, 0x000014, abi.encodePacked(mockExecutor));

        // Call execute as the entry point
        vm.prank(_entryPoint);
        ExecutionOutput memory output = HappyAccount(payable(smartAccount)).execute(boop);

        // Should return SUCCEEDED
        assertEq(uint8(output.status), uint8(CallStatus.SUCCEEDED));

        // Verify the ETH transfer was successful
        assertEq(recipient.balance, initialBalance + transferAmount, "ETH should be transferred");
    }

    function testExecuteWithMockExecutorFail() public {
        // Set execution mode to Fail
        MockExecutor(mockExecutor).setExecutionMode(1);

        // Register the MockExecutor as an executor extension
        _setupMockExecutor(mockExecutor);

        // Create a boop with the MockExecutor address in extraData
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));

        // Add the MockExecutor address to extraData with EXECUTOR_KEY
        boop.extraData = encodeExtensionData(EXECUTOR_KEY, 0x000014, abi.encodePacked(mockExecutor));

        // Call execute as the entry point
        vm.prank(_entryPoint);
        ExecutionOutput memory output = HappyAccount(payable(smartAccount)).execute(boop);

        // Should return EXECUTE_REJECTED
        assertEq(uint8(output.status), uint8(CallStatus.EXECUTE_REJECTED));
        assertEq(output.revertData, abi.encodeWithSelector(MockExecutor.InvalidInput.selector));
    }

    function testExecuteWithMockExecutorRevert() public {
        // Set execution mode to Revert with custom error
        MockExecutor(mockExecutor).setExecutionMode(2);

        // Register the MockExecutor as an executor extension
        _setupMockExecutor(mockExecutor);

        // Create a boop with the MockExecutor address in extraData
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));

        // Add the MockExecutor address to extraData with EXECUTOR_KEY
        boop.extraData = encodeExtensionData(EXECUTOR_KEY, 0x000014, abi.encodePacked(mockExecutor));

        // Call execute as the entry point
        vm.prank(_entryPoint);

        // The executor should revert with a custom error
        vm.expectRevert(abi.encodeWithSelector(MockExecutor.CustomErrorMockRevert.selector));
        HappyAccount(payable(smartAccount)).execute(boop);
    }

    function testExecuteWithMockExecutorEmptyRevert() public {
        // Set execution mode to Empty Revert
        MockExecutor(mockExecutor).setExecutionMode(3);

        // Register the MockExecutor as an executor extension
        _setupMockExecutor(mockExecutor);

        // Create a boop with the MockExecutor address in extraData
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));

        // Add the MockExecutor address to extraData with EXECUTOR_KEY
        boop.extraData = encodeExtensionData(EXECUTOR_KEY, 0x000014, abi.encodePacked(mockExecutor));

        // Call execute as the entry point
        vm.prank(_entryPoint);

        // The executor should revert without any revert data
        vm.expectRevert();
        HappyAccount(payable(smartAccount)).execute(boop);
    }

    // ====================================================================================================
    // PAYOUT TESTS

    function testPayoutNotFromEntryPoint() public {
        vm.prank(address(1));
        vm.expectRevert(NotFromEntryPoint.selector);
        HappyAccount(payable(smartAccount)).payout(1 ether);
    }

    function testPayoutSucceeds() public {
        address payable mockOrigin = payable(address(0xDeadBeef));
        vm.deal(mockOrigin, 1 ether); // To make the account "non-empty", otherwise call takes extra 25K gas
        uint256 initialTxOriginBalance = mockOrigin.balance;

        vm.deal(smartAccount, 1 ether); // To pay the tx.origin

        // Warm up the smartAccount address with a dummy call
        vm.prank(_entryPoint, mockOrigin);
        HappyAccount(payable(smartAccount)).payout(0);

        // Measure gas usage on the actual call we want to measure
        vm.prank(_entryPoint, mockOrigin);
        uint256 gasBefore = gasleft();
        HappyAccount(payable(smartAccount)).payout(1 ether);
        uint256 gasUsed = gasBefore - gasleft();

        // Check that tx.origin received the funds
        assertEq(mockOrigin.balance, initialTxOriginBalance + 1 ether);

        // Verify gas usage is within expected limits
        assertLe(gasUsed, 12000);
    }

    // ====================================================================================================
    // ISVALIDSIGNATURE TESTS

    function testIsValidSignatureWithValidSignature() public view {
        // Create a test message hash
        bytes32 messageHash = keccak256(abi.encodePacked("test message"));

        // Sign the message with the owner's private key
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, messageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Call isValidSignature and verify it returns the correct magic value
        bytes4 result = HappyAccount(payable(smartAccount)).isValidSignature(messageHash, signature);
        bytes4 expectedMagicValue = 0x1626ba7e; // MAGIC_VALUE from ERC-1271
        assertEq(result, expectedMagicValue);
    }

    function testIsValidSignatureWithInvalidSignature() public view {
        // Create a test message hash
        bytes32 messageHash = keccak256(abi.encodePacked("test message"));

        // Use a different private key to create an invalid signature
        uint256 wrongPrivKey = 0x2222222222222222222222222222222222222222222222222222222222222222;
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPrivKey, messageHash);
        bytes memory invalidSignature = abi.encodePacked(r, s, v);

        // Call isValidSignature and verify it returns bytes4(0) for invalid signature
        bytes4 result = HappyAccount(payable(smartAccount)).isValidSignature(messageHash, invalidSignature);
        assertEq(result, bytes4(0));
    }

    // ====================================================================================================
    // INTERFACE SUPPORT TESTS

    function testSupportsInterface() public view {
        // Get reference to the HappyAccount contract
        HappyAccount account = HappyAccount(payable(smartAccount));

        // Test that a random interface ID is not supported
        bytes4 randomInterfaceId = 0x12345678;
        assertFalse(account.supportsInterface(randomInterfaceId), "Should not support random interface");

        // Test for supported interfaces
        bytes4 erc165InterfaceId = 0x01ffc9a7; // ERC-165 interface ID
        assertTrue(account.supportsInterface(erc165InterfaceId), "Should support ERC-165");

        bytes4 erc1271InterfaceId = 0x1626ba7e; // ERC-1271 interface ID
        assertTrue(account.supportsInterface(erc1271InterfaceId), "Should support ERC-1271");

        // IAccount interface ID
        bytes4 accountInterfaceId = IAccount.validate.selector ^ IAccount.execute.selector ^ IAccount.payout.selector;
        assertTrue(account.supportsInterface(accountInterfaceId), "Should support IAccount");

        // IExtensibleAccount interface ID
        bytes4 extensibleInterfaceId = IExtensibleAccount.isExtensionRegistered.selector
            ^ IExtensibleAccount.addExtension.selector ^ IExtensibleAccount.removeExtension.selector;
        assertTrue(account.supportsInterface(extensibleInterfaceId), "Should support IExtensibleAccount");
    }

    // ====================================================================================================
    // ADD/REMOVE EXTENSIONS TESTS

    function testAddExtension() public {
        // Create a mock extension address
        address mockValidatorExtension = address(0x1234);
        address mockExecutorExtension = address(0x5678);

        // Initially, the extensions should not be registered
        assertFalse(
            HappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Validator)
        );
        assertFalse(
            HappyAccount(payable(smartAccount)).isExtensionRegistered(mockExecutorExtension, ExtensionType.Executor)
        );

        // Test adding a validator extension
        vm.prank(owner);
        HappyAccount(payable(smartAccount)).addExtension(mockValidatorExtension, ExtensionType.Validator, "");

        // Verify the validator extension is now registered
        assertTrue(
            HappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Validator)
        );

        // Test adding an executor extension
        vm.prank(owner);
        HappyAccount(payable(smartAccount)).addExtension(mockExecutorExtension, ExtensionType.Executor, "");

        // Verify the executor extension is now registered
        assertTrue(
            HappyAccount(payable(smartAccount)).isExtensionRegistered(mockExecutorExtension, ExtensionType.Executor)
        );

        // Try adding the same validator extension again - should revert with ExtensionAlreadyRegistered
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(ExtensionAlreadyRegistered.selector, mockValidatorExtension, ExtensionType.Validator)
        );
        HappyAccount(payable(smartAccount)).addExtension(mockValidatorExtension, ExtensionType.Validator, "");

        // Try adding the same executor extension again - should revert with ExtensionAlreadyRegistered
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(ExtensionAlreadyRegistered.selector, mockExecutorExtension, ExtensionType.Executor)
        );
        HappyAccount(payable(smartAccount)).addExtension(mockExecutorExtension, ExtensionType.Executor, "");

        // Test adding the same address but as a different extension type (should work)
        vm.prank(owner);
        HappyAccount(payable(smartAccount)).addExtension(mockValidatorExtension, ExtensionType.Executor, "");

        // Verify both extension types are registered for the validator address
        assertTrue(
            HappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Validator)
        );
        assertTrue(
            HappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Executor)
        );

        // Test adding extension from the account itself (using onlySelfOrOwner modifier)
        vm.prank(smartAccount);
        HappyAccount(payable(smartAccount)).addExtension(address(0xABCD), ExtensionType.Validator, "");

        // Verify the new extension is registered
        assertTrue(HappyAccount(payable(smartAccount)).isExtensionRegistered(address(0xABCD), ExtensionType.Validator));

        // Test adding extension from a non-owner, non-self address (should revert with NotSelfOrOwner)
        address nonOwner = address(0x9999);
        vm.prank(nonOwner);
        vm.expectRevert(HappyAccount.NotSelfOrOwner.selector);
        HappyAccount(payable(smartAccount)).addExtension(address(0xDEAD), ExtensionType.Validator, "");
    }

    function testRemoveExtension() public {
        // Create a mock extension address
        address mockValidatorExtension = address(0x1234);
        address mockExecutorExtension = address(0x5678);

        // Add the extensions first
        vm.startPrank(owner);
        HappyAccount(payable(smartAccount)).addExtension(mockValidatorExtension, ExtensionType.Validator, "");
        HappyAccount(payable(smartAccount)).addExtension(mockExecutorExtension, ExtensionType.Executor, "");
        HappyAccount(payable(smartAccount)).addExtension(mockValidatorExtension, ExtensionType.Executor, ""); // Same address, different type
        vm.stopPrank();

        // Verify the extensions are registered
        assertTrue(
            HappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Validator)
        );
        assertTrue(
            HappyAccount(payable(smartAccount)).isExtensionRegistered(mockExecutorExtension, ExtensionType.Executor)
        );
        assertTrue(
            HappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Executor)
        );

        // Test removing a validator extension
        vm.prank(owner);
        HappyAccount(payable(smartAccount)).removeExtension(mockValidatorExtension, ExtensionType.Validator, "");

        // Verify the validator extension is no longer registered
        assertFalse(
            HappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Validator)
        );

        // But it should still be registered as an executor extension
        assertTrue(
            HappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Executor)
        );

        // Test removing an executor extension
        vm.prank(owner);
        HappyAccount(payable(smartAccount)).removeExtension(mockExecutorExtension, ExtensionType.Executor, "");

        // Verify the executor extension is no longer registered
        assertFalse(
            HappyAccount(payable(smartAccount)).isExtensionRegistered(mockExecutorExtension, ExtensionType.Executor)
        );

        // Try removing an extension that's not registered - should revert with ExtensionNotRegistered
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(ExtensionNotRegistered.selector, mockValidatorExtension, ExtensionType.Validator)
        );
        HappyAccount(payable(smartAccount)).removeExtension(mockValidatorExtension, ExtensionType.Validator, "");

        // Test removing extension from the account itself (using onlySelfOrOwner modifier)
        vm.prank(smartAccount);
        HappyAccount(payable(smartAccount)).removeExtension(mockValidatorExtension, ExtensionType.Executor, "");

        // Verify the extension is no longer registered
        assertFalse(
            HappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Executor)
        );

        // Test removing extension from a non-owner, non-self address (should revert with NotSelfOrOwner)
        address nonOwner = address(0x9999);

        // First add an extension to remove
        vm.prank(owner);
        HappyAccount(payable(smartAccount)).addExtension(mockExecutorExtension, ExtensionType.Validator, "");

        // Try to remove it as non-owner
        vm.prank(nonOwner);
        vm.expectRevert(HappyAccount.NotSelfOrOwner.selector);
        HappyAccount(payable(smartAccount)).removeExtension(mockExecutorExtension, ExtensionType.Validator, "");

        // Verify the extension is still registered
        assertTrue(
            HappyAccount(payable(smartAccount)).isExtensionRegistered(mockExecutorExtension, ExtensionType.Validator)
        );
    }

    // ====================================================================================================
    // EXTENSIONS INSTALL/UNINSTALL DATA TESTS

    function testAddExtensionWithInstallDataPasses() public {
        // Should succeed when initValidator(1) is called
        bytes memory installData = abi.encodeCall(MockValidator.initValidator, (1));
        vm.prank(owner);
        HappyAccount(payable(smartAccount)).addExtension(mockValidator, ExtensionType.Validator, installData);
        // Should be registered
        assertTrue(HappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidator, ExtensionType.Validator));
    }

    function testAddExtensionWithInstallDataFails() public {
        // Should revert when initValidator(0) is called
        bytes memory installData = abi.encodeCall(MockValidator.initValidator, (0));
        vm.prank(owner);
        vm.expectRevert();
        HappyAccount(payable(smartAccount)).addExtension(mockValidator, ExtensionType.Validator, installData);
        // Should not be registered
        assertFalse(HappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidator, ExtensionType.Validator));
    }

    function testRemoveExtensionWithUninstallDataPasses() public {
        // Add first
        vm.prank(owner);
        HappyAccount(payable(smartAccount)).addExtension(mockValidator, ExtensionType.Validator, "");
        // Should succeed when deInitValidator(1) is called
        bytes memory uninstallData = abi.encodeCall(MockValidator.deInitValidator, (1));
        vm.prank(owner);
        HappyAccount(payable(smartAccount)).removeExtension(mockValidator, ExtensionType.Validator, uninstallData);
        // Should not be registered
        assertFalse(HappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidator, ExtensionType.Validator));
    }

    function testRemoveExtensionWithUninstallDataFails() public {
        // Add first
        vm.prank(owner);
        HappyAccount(payable(smartAccount)).addExtension(mockValidator, ExtensionType.Validator, "");
        // Should revert when deInitValidator(0) is called
        bytes memory uninstallData = abi.encodeCall(MockValidator.deInitValidator, (0));
        vm.prank(owner);
        vm.expectRevert();
        HappyAccount(payable(smartAccount)).removeExtension(mockValidator, ExtensionType.Validator, uninstallData);
        // Should still be registered
        assertTrue(HappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidator, ExtensionType.Validator));
    }

    // ====================================================================================================
    // EXECUTE FROM EXECUTOR TESTS (EXTENSIONS)

    function testExecuteCallFromExecutorWithWrongSender() public {
        // Setup
        address _mockExecutor = address(0x1234);
        _setupMockExecutor(_mockExecutor);
        address wrongSender = address(0x5678);
        address recipient = address(0xBEEF);

        // Create call info
        CallInfo memory info = CallInfo({dest: payable(recipient), value: 0.1 ether, callData: ""});

        // Try to call executeCallFromExecutor as the wrong sender
        vm.prank(wrongSender);
        vm.expectRevert("not called from executor");
        HappyAccount(payable(smartAccount)).executeCallFromExecutor(info);
    }

    // ====================================================================================================
    // HELPERS

    // Helper function to set up any extension type
    function _setupExtension(address _extension, ExtensionType _extensionType, bytes memory installData) internal {
        // Add the extension to the smart account
        vm.prank(owner);
        HappyAccount(payable(smartAccount)).addExtension(_extension, _extensionType, installData);
    }

    // Helper function to set up a mock executor (for backward compatibility)
    function _setupMockExecutor(address _mockExecutor) internal {
        _setupExtension(_mockExecutor, ExtensionType.Executor, "");
    }

    function _setupMockValidator(address _mockValidator) internal {
        _setupExtension(_mockValidator, ExtensionType.Validator, "");
    }

    /**
     * @notice Helper function to encode extension data
     * @param key The extension key (3 bytes)
     * @param length The length prefix for the data (3 bytes)
     * @param data The extension data
     * @return bytes The encoded extension data
     */
    function encodeExtensionData(bytes3 key, bytes3 length, bytes memory data) internal pure returns (bytes memory) {
        return abi.encodePacked(key, length, data);
    }
}
