// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTxTestUtils} from "../Utils.sol";
import {MockERC20} from "../../../mocks/MockERC20.sol";
import {MockRevert} from "../../../mocks/MockRevert.sol";
import {MockValidator} from "../../../test/mocks/MockValidator.sol";

import {HappyTx} from "boop/core/HappyTx.sol";
import {HappyTxLib} from "boop/libs/HappyTxLib.sol";

import {ScrappyAccount} from "boop/samples/ScrappyAccount.sol";
import {ExecutionOutput} from "boop/interfaces/IHappyAccount.sol";
import {CallStatus} from "boop/core/HappyEntryPoint.sol";
import {
    CallInfo,
    ExtensionType,
    ExtensionAlreadyRegistered,
    ExtensionNotRegistered,
    InvalidExtensionValue
} from "boop/interfaces/extensions/IExtensibleBoopAccount.sol";
import {VALIDATOR_KEY} from "boop/interfaces/extensions/ICustomBoopValidator.sol";

import {DeployHappyAAContracts} from "../../../deploy/DeployHappyAA.s.sol";
import {InvalidSignature, UnknownDuringSimulation} from "boop/utils/Common.sol";

import {console} from "forge-std/Script.sol";

contract ScrappyAccountTest is HappyTxTestUtils {
    using HappyTxLib for HappyTx;

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

    DeployHappyAAContracts private deployer;

    address private _happyEntryPoint;
    address private smartAccount;
    address private mockValidator;
    address private mockToken;
    address private mockRevert;
    uint256 private privKey;
    address private owner;
    address private dest;

    function setUp() public {
        privKey = uint256(vm.envBytes32("PRIVATE_KEY_LOCAL"));
        owner = vm.addr(privKey);

        // Set up the Deployment Script, and deploy the happy-aa contracts as foundry-account-0
        deployer = new DeployHappyAAContracts();
        vm.prank(owner);
        deployer.deployForTests();

        happyEntryPoint = deployer.happyEntryPoint();
        _happyEntryPoint = address(happyEntryPoint);
        smartAccount = deployer.scrappyAccountFactory().createAccount(SALT, owner);

        dest = deployer.scrappyAccountFactory().createAccount(SALT2, owner);

        // Fund the smart account
        vm.deal(smartAccount, INITIAL_DEPOSIT);

        // Deploy a mock ERC20 token, and a mock token that always reverts
        mockToken = address(new MockERC20("MockTokenA", "MTA", uint8(18)));
        mockRevert = address(new MockRevert());

        // Deploy a mock validator
        mockValidator = address(new MockValidator());
    }

    // ====================================================================================================
    // SIGNATURE VALIDATION TESTS

    function testValidateEmptySignature() public {
        // Create a happyTx with an empty signature
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));

        // Validate function must be called by the HappyEntryPoint
        vm.prank(_happyEntryPoint);

        // The function should revert with ValidationReverted(InvalidSignature.selector)
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InvalidSignature()"))));

        ScrappyAccount(payable(smartAccount)).validate(happyTx);
    }

    function testValidateInvalidSignatureLength() public {
        // Create a happyTx with a signature of invalid length
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.validatorData = hex"deadbeef";

        // Validate function must be called by the HappyEntryPoint
        vm.prank(_happyEntryPoint);

        // The function should revert with ValidationReverted(InvalidSignature.selector)
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InvalidSignature()"))));

        ScrappyAccount(payable(smartAccount)).validate(happyTx);
    }

    function testValidateInvalidSignature() public {
        // Create a happyTx with a dummy signature of length 65 bytes
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.validatorData =
            hex"deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefde";

        // Validate function must be called by the HappyEntryPoint
        vm.prank(_happyEntryPoint);

        // The function should revert with ValidationReverted(InvalidSignature.selector)
        vm.expectRevert(abi.encodeWithSelector(InvalidSignature.selector));

        ScrappyAccount(payable(smartAccount)).validate(happyTx);
    }

    function testValidateInvalidOwnerSignature() public {
        // Create a happyTx with a signature from a different owner
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.validatorData = signHappyTx(happyTx, DUMMY_PRIV_KEY);

        // Validate function must be called by the HappyEntryPoint
        vm.prank(_happyEntryPoint);

        bytes memory validationData = ScrappyAccount(payable(smartAccount)).validate(happyTx);
        assertEq(validationData, abi.encodeWithSelector(InvalidSignature.selector));
    }

    // ====================================================================================================
    // SIGNATURE VALIDATION TESTS (SIMULATION)

    function testSimulationValidateUnknownDuringSimulation() public {
        // Create a happyTx with a signature from a different owner
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.validatorData = signHappyTx(happyTx, DUMMY_PRIV_KEY);

        // Validate function must be called by the HappyEntryPoint, with tx.origin = address(0)
        vm.prank(_happyEntryPoint, ZERO_ADDRESS);

        bytes memory validationData = ScrappyAccount(payable(smartAccount)).validate(happyTx);
        assertEq(validationData, abi.encodeWithSelector(UnknownDuringSimulation.selector));
    }

    // ====================================================================================================
    // VALIDATION TESTS (EXTENSIONS)
    
    function testValidateWithInvalidExtensionValue() public {
        // Create a HappyTx with invalid validator address in extraData (not 20 bytes)
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        
        // Create invalid validator address (less than 20 bytes)
        bytes memory invalidValidatorAddress = "deadbeefdeadbeefde";
        
        // Add the invalid validator address to extraData with VALIDATOR_KEY
        happyTx.extraData = abi.encodePacked(
            bytes3(VALIDATOR_KEY),
            bytes3(0x000010), // Length prefix for address (should be 10 bytes)
            invalidValidatorAddress
        );

        // Call validate as the entry point
        vm.prank(_happyEntryPoint);
        bytes memory result = ScrappyAccount(payable(smartAccount)).validate(happyTx);
        
        // Should return InvalidExtensionValue selector
        assertEq(result, abi.encodeWithSelector(InvalidExtensionValue.selector));
    }
    
    function testValidateWithUnregisteredExtension() public {
        // Create a HappyTx with unregistered validator address in extraData
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        
        // Create a validator address that is not registered
        address unregisteredValidator = address(0xDEAD);
        
        // Add the unregistered validator address to extraData with VALIDATOR_KEY
        happyTx.extraData = abi.encodePacked(
            bytes3(VALIDATOR_KEY),
            bytes3(0x000014), // Length prefix for address (20 bytes)
            abi.encodePacked(unregisteredValidator)
        );
        
        // Call validate as the entry point
        vm.prank(_happyEntryPoint);
        bytes memory result = ScrappyAccount(payable(smartAccount)).validate(happyTx);
        
        // Should return ExtensionNotRegistered selector
        assertEq(result, abi.encodeWithSelector(ExtensionNotRegistered.selector));
    }
    
    function testValidateWithMockValidatorApprove() public {
        // Register the MockValidator as a validator extension
        _setupMockValidator(mockValidator);
        
        // Create a HappyTx with the MockValidator address in extraData
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        
        // Add the MockValidator address to extraData with VALIDATOR_KEY
        happyTx.extraData = abi.encodePacked(
            bytes3(VALIDATOR_KEY),
            bytes3(0x000014), // Length prefix for address (20 bytes)
            abi.encodePacked(mockValidator)
        );
        
        // Call validate as the entry point
        vm.prank(_happyEntryPoint);
        bytes memory result = ScrappyAccount(payable(smartAccount)).validate(happyTx);
        
        // Should return empty bytes (approved)
        assertEq(result, "");
    }
    
    function testValidateWithMockValidatorReject() public {
        // Set validation mode to Reject
        MockValidator(mockValidator).setValidationMode(1);

        // Register the MockValidator as a validator extension
        _setupMockValidator(mockValidator);
        
        // Create a HappyTx with the MockValidator address in extraData
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        
        // Add the MockValidator address to extraData with VALIDATOR_KEY
        happyTx.extraData = abi.encodePacked(
            bytes3(VALIDATOR_KEY),
            bytes3(0x000014), // Length prefix for address (20 bytes)
            abi.encodePacked(mockValidator)
        );
        
        // Call validate as the entry point
        vm.prank(_happyEntryPoint);
        bytes memory result = ScrappyAccount(payable(smartAccount)).validate(happyTx);
        
        // Should return ValidationRejected selector
        assertEq(result, abi.encodeWithSelector(MockValidator.ValidationRejected.selector));
    }
    
    function testValidateWithMockValidatorRevert() public {
        // Set validation mode to Revert
        MockValidator(mockValidator).setValidationMode(2);

        // Register the MockValidator as a validator extension
        _setupMockValidator(mockValidator);
        
        // Create a HappyTx with the MockValidator address in extraData
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        
        // Add the MockValidator address to extraData with VALIDATOR_KEY
        happyTx.extraData = abi.encodePacked(
            bytes3(VALIDATOR_KEY),
            bytes3(0x000014), // Length prefix for address (20 bytes)
            abi.encodePacked(mockValidator)
        );
        
        // Call validate as the entry point
        vm.prank(_happyEntryPoint);
        
        // The validator should revert
        vm.expectRevert(abi.encodeWithSelector(MockValidator.CustomErrorMockRevert.selector));
        ScrappyAccount(payable(smartAccount)).validate(happyTx);
    }

    function testValidateWithMockValidatorEmptyRevert() public {
        // Set validation mode to Empty Revert
        MockValidator(mockValidator).setValidationMode(3);

        // Register the MockValidator as a validator extension
        _setupMockValidator(mockValidator);
        
        // Create a HappyTx with the MockValidator address in extraData
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        
        // Add the MockValidator address to extraData with VALIDATOR_KEY
        happyTx.extraData = abi.encodePacked(
            bytes3(VALIDATOR_KEY),
            bytes3(0x000014), // Length prefix for address (20 bytes)
            abi.encodePacked(mockValidator)
        );
        
        // Call validate as the entry point
        vm.prank(_happyEntryPoint);
        
        // The validator should revert
        vm.expectRevert();
        ScrappyAccount(payable(smartAccount)).validate(happyTx);
    }

    // ====================================================================================================
    // EXECUTION TESTS

    function testExecuteMintToken() public {
        uint256 initialTokenBalance = getTokenBalance(mockToken, dest);

        // Create a valid happyTx for minting mock tokens
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, smartAccount, mockToken, privKey);

        // Execute the transaction
        vm.prank(_happyEntryPoint);
        ExecutionOutput memory output = ScrappyAccount(payable(smartAccount)).execute(happyTx);

        assertTrue(output.status == CallStatus.SUCCEEDED);
        assertEq(output.revertData, new bytes(0));

        uint256 finalTokenBalance = getTokenBalance(mockToken, dest);
        assertEq(finalTokenBalance, initialTokenBalance + TOKEN_MINT_AMOUNT);
    }

    function testExecuteEthTransfer() public {
        uint256 initialBalance = getEthBalance(dest);

        // Create a valid happyTx for transferring ETH
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.value = 1 ether;
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        // Execute the transaction
        vm.prank(_happyEntryPoint);
        ExecutionOutput memory output = ScrappyAccount(payable(smartAccount)).execute(happyTx);

        assertTrue(output.status == CallStatus.SUCCEEDED);
        assertEq(output.revertData, new bytes(0));

        uint256 finalBalance = getEthBalance(dest);
        assertEq(finalBalance, initialBalance + happyTx.value);
    }

    function testExecuteInnerCallFails() public {
        uint256 initialTokenBalance = getTokenBalance(mockToken, dest);

        // Create a happyTx with wrong token address, so the call reverts
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, smartAccount, dest, privKey);

        // Execute the transaction
        vm.prank(_happyEntryPoint);
        ExecutionOutput memory output = ScrappyAccount(payable(smartAccount)).execute(happyTx);

        assertTrue(output.status == CallStatus.CALL_REVERTED);
        assertEq(output.revertData, new bytes(0));

        uint256 finalTokenBalance = getTokenBalance(mockToken, dest);
        assertEq(finalTokenBalance, initialTokenBalance);
    }

    // ====================================================================================================
    // EXECUTION TESTS (EXTENSIONS)

    // ====================================================================================================
    // PAYOUT TESTS

    // ====================================================================================================
    // ISVALIDSIGNATURE TESTS

    function testIsValidSignatureWithValidSignature() public view {
        // Create a test message hash
        bytes32 messageHash = keccak256(abi.encodePacked("test message"));

        // Sign the message with the owner's private key
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, messageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Call isValidSignature and verify it returns the correct magic value
        bytes4 result = ScrappyAccount(payable(smartAccount)).isValidSignature(messageHash, signature);
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
        bytes4 result = ScrappyAccount(payable(smartAccount)).isValidSignature(messageHash, invalidSignature);
        assertEq(result, bytes4(0));
    }

    // ====================================================================================================
    // INTERFACE SUPPORT TESTS

    function testSupportsInterface() public view {
        // Get reference to the ScrappyAccount contract
        ScrappyAccount account = ScrappyAccount(payable(smartAccount));

        // Test that a random interface ID is not supported
        bytes4 randomInterfaceId = 0x12345678;
        assertFalse(account.supportsInterface(randomInterfaceId), "Should not support random interface");

        // Test for supported interfaces
        bytes4 erc165InterfaceId = 0x01ffc9a7; // ERC-165 interface ID
        assertTrue(account.supportsInterface(erc165InterfaceId), "Should support ERC-165");

        bytes4 erc1271InterfaceId = 0x1626ba7e; // ERC-1271 interface ID
        assertTrue(account.supportsInterface(erc1271InterfaceId), "Should support ERC-1271");

        bytes4 happyAccountInterfaceId = 0x2b39e81f; // IHappyAccount interface ID
        assertTrue(account.supportsInterface(happyAccountInterfaceId), "Should support IHappyAccount");

        bytes4 happyPaymasterInterfaceId = 0x24542ca5; // IHappyPaymaster interface ID
        assertTrue(account.supportsInterface(happyPaymasterInterfaceId), "Should support IHappyPaymaster");
    }

    // ====================================================================================================
    // ADD/REMOVE EXTENSIONS TESTS

    function testAddExtension() public {
        // Create a mock extension address
        address mockValidatorExtension = address(0x1234);
        address mockExecutorExtension = address(0x5678);

        // Initially, the extensions should not be registered
        assertFalse(
            ScrappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Validator)
        );
        assertFalse(
            ScrappyAccount(payable(smartAccount)).isExtensionRegistered(mockExecutorExtension, ExtensionType.Executor)
        );

        // Test adding a validator extension
        vm.prank(owner);
        ScrappyAccount(payable(smartAccount)).addExtension(mockValidatorExtension, ExtensionType.Validator);

        // Verify the validator extension is now registered
        assertTrue(
            ScrappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Validator)
        );

        // Test adding an executor extension
        vm.prank(owner);
        ScrappyAccount(payable(smartAccount)).addExtension(mockExecutorExtension, ExtensionType.Executor);

        // Verify the executor extension is now registered
        assertTrue(
            ScrappyAccount(payable(smartAccount)).isExtensionRegistered(mockExecutorExtension, ExtensionType.Executor)
        );

        // Try adding the same validator extension again - should revert with ExtensionAlreadyRegistered
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(ExtensionAlreadyRegistered.selector, mockValidatorExtension, ExtensionType.Validator)
        );
        ScrappyAccount(payable(smartAccount)).addExtension(mockValidatorExtension, ExtensionType.Validator);

        // Try adding the same executor extension again - should revert with ExtensionAlreadyRegistered
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(ExtensionAlreadyRegistered.selector, mockExecutorExtension, ExtensionType.Executor)
        );
        ScrappyAccount(payable(smartAccount)).addExtension(mockExecutorExtension, ExtensionType.Executor);

        // Test adding the same address but as a different extension type (should work)
        vm.prank(owner);
        ScrappyAccount(payable(smartAccount)).addExtension(mockValidatorExtension, ExtensionType.Executor);

        // Verify both extension types are registered for the validator address
        assertTrue(
            ScrappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Validator)
        );
        assertTrue(
            ScrappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Executor)
        );

        // Test adding extension from the account itself (using onlySelfOrOwner modifier)
        vm.prank(smartAccount);
        ScrappyAccount(payable(smartAccount)).addExtension(address(0xABCD), ExtensionType.Validator);

        // Verify the new extension is registered
        assertTrue(
            ScrappyAccount(payable(smartAccount)).isExtensionRegistered(address(0xABCD), ExtensionType.Validator)
        );

        // Test adding extension from a non-owner, non-self address (should revert with NotSelfOrOwner)
        address nonOwner = address(0x9999);
        vm.prank(nonOwner);
        vm.expectRevert(ScrappyAccount.NotSelfOrOwner.selector);
        ScrappyAccount(payable(smartAccount)).addExtension(address(0xDEAD), ExtensionType.Validator);
    }

    function testRemoveExtension() public {
        // Create a mock extension address
        address mockValidatorExtension = address(0x1234);
        address mockExecutorExtension = address(0x5678);

        // Add the extensions first
        vm.startPrank(owner);
        ScrappyAccount(payable(smartAccount)).addExtension(mockValidatorExtension, ExtensionType.Validator);
        ScrappyAccount(payable(smartAccount)).addExtension(mockExecutorExtension, ExtensionType.Executor);
        ScrappyAccount(payable(smartAccount)).addExtension(mockValidatorExtension, ExtensionType.Executor); // Same address, different type
        vm.stopPrank();

        // Verify the extensions are registered
        assertTrue(
            ScrappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Validator)
        );
        assertTrue(
            ScrappyAccount(payable(smartAccount)).isExtensionRegistered(mockExecutorExtension, ExtensionType.Executor)
        );
        assertTrue(
            ScrappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Executor)
        );

        // Test removing a validator extension
        vm.prank(owner);
        ScrappyAccount(payable(smartAccount)).removeExtension(mockValidatorExtension, ExtensionType.Validator);

        // Verify the validator extension is no longer registered
        assertFalse(
            ScrappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Validator)
        );

        // But it should still be registered as an executor extension
        assertTrue(
            ScrappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Executor)
        );

        // Test removing an executor extension
        vm.prank(owner);
        ScrappyAccount(payable(smartAccount)).removeExtension(mockExecutorExtension, ExtensionType.Executor);

        // Verify the executor extension is no longer registered
        assertFalse(
            ScrappyAccount(payable(smartAccount)).isExtensionRegistered(mockExecutorExtension, ExtensionType.Executor)
        );

        // Try removing an extension that's not registered - should revert with ExtensionNotRegistered
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(ExtensionNotRegistered.selector, mockValidatorExtension, ExtensionType.Validator)
        );
        ScrappyAccount(payable(smartAccount)).removeExtension(mockValidatorExtension, ExtensionType.Validator);

        // Test removing extension from the account itself (using onlySelfOrOwner modifier)
        vm.prank(smartAccount);
        ScrappyAccount(payable(smartAccount)).removeExtension(mockValidatorExtension, ExtensionType.Executor);

        // Verify the extension is no longer registered
        assertFalse(
            ScrappyAccount(payable(smartAccount)).isExtensionRegistered(mockValidatorExtension, ExtensionType.Executor)
        );

        // Test removing extension from a non-owner, non-self address (should revert with NotSelfOrOwner)
        address nonOwner = address(0x9999);

        // First add an extension to remove
        vm.prank(owner);
        ScrappyAccount(payable(smartAccount)).addExtension(mockExecutorExtension, ExtensionType.Validator);

        // Try to remove it as non-owner
        vm.prank(nonOwner);
        vm.expectRevert(ScrappyAccount.NotSelfOrOwner.selector);
        ScrappyAccount(payable(smartAccount)).removeExtension(mockExecutorExtension, ExtensionType.Validator);

        // Verify the extension is still registered
        assertTrue(
            ScrappyAccount(payable(smartAccount)).isExtensionRegistered(mockExecutorExtension, ExtensionType.Validator)
        );
    }

    // ====================================================================================================
    // EXECUTE FROM EXECUTOR TESTS (EXTENSIONS) // TODO: how do I set the transient storage slot

    // function testExecuteCallFromExecutor() public {
    //     // Setup
    //     address mockExecutor = _setupMockExecutor();
    //     address recipient = address(0xBEEF);
    //     uint256 mintAmount = 100;

    //     // Prepare calldata for token minting
    //     bytes memory callData = abi.encodeWithSelector(MockERC20.mint.selector, recipient, mintAmount);

    //     // Check initial token balance
    //     uint256 initialBalance = MockERC20(mockToken).balanceOf(recipient);

    //     // Set the dispatchedExecutor
    //     _setDispatchedExecutor(mockExecutor);

    //     // Execute the call
    //     (bool success,) = _executeCallFromExecutor(mockExecutor, payable(mockToken), 0, callData);

    //     // Verify results
    //     assertTrue(success, "Call should succeed");
    //     assertEq(MockERC20(mockToken).balanceOf(recipient), initialBalance + mintAmount, "Tokens should be minted");
    // }

    function testExecuteCallFromExecutorWithWrongSender() public {
        // Setup
        address mockExecutor = address(0x1234);
        _setupMockExecutor(mockExecutor);
        address wrongSender = address(0x5678);
        address recipient = address(0xBEEF);

        // Set the dispatchedExecutor
        _setDispatchedExecutor(mockExecutor);

        // Create call info
        CallInfo memory info = CallInfo({dest: payable(recipient), value: 0.1 ether, callData: ""});

        // Try to call executeCallFromExecutor as the wrong sender
        vm.prank(wrongSender);
        vm.expectRevert("not called from executor");
        ScrappyAccount(payable(smartAccount)).executeCallFromExecutor(info);
    }

    // function testExecuteCallFromExecutorWithFailingCall() public {
    //     // Setup
    //     address mockExecutor = _setupMockExecutor();

    //     // Prepare calldata for a reverting function
    //     bytes memory callData = abi.encodeWithSelector(MockRevert.intentionalRevert.selector);

    //     // Set the dispatchedExecutor
    //     _setDispatchedExecutor(mockExecutor);

    //     // Execute the call
    //     (bool success,) = _executeCallFromExecutor(mockExecutor, payable(mockRevert), 0, callData);

    //     // Verify the call failed (but the executeCallFromExecutor function itself didn't revert)
    //     assertFalse(success, "Call should fail");
    // }

    // ====================================================================================================
    // HELPERS

    // Helper function to set up any extension type
    function _setupExtension(address _extension, ExtensionType _extensionType) internal {
        // Add the extension to the smart account
        vm.prank(owner);
        ScrappyAccount(payable(smartAccount)).addExtension(_extension, _extensionType);
    }
    
    // Helper function to set up a mock executor (for backward compatibility)
    function _setupMockExecutor(address _mockExecutor) internal {
        _setupExtension(_mockExecutor, ExtensionType.Executor);
    }

    function _setupMockValidator(address _mockValidator) internal {
        _setupExtension(_mockValidator, ExtensionType.Validator);
    }

    // Helper function to set the dispatchedExecutor transient variable
    function _setDispatchedExecutor(address _executor) internal {
        // The dispatchedExecutor is a transient private variable in the ScrappyAccount contract
        // https://docs.soliditylang.org/en/latest/internals/layout_in_storage.html#:~:text=The%20rules%20described,for%20transient%20storage.
        bytes32 slot = bytes32(uint256(0));
        vm.store(smartAccount, slot, bytes32(uint256(uint160(_executor))));
    }

    // Helper function to execute a call through the executor and return success
    function _executeCallFromExecutor(address _executor, address payable _dest, uint256 _value, bytes memory _callData)
        internal
        returns (bool success, bytes memory returnData)
    {
        CallInfo memory info = CallInfo({dest: _dest, value: _value, callData: _callData});

        vm.prank(_executor);
        (success, returnData) = ScrappyAccount(payable(smartAccount)).executeCallFromExecutor(info);
    }
}
