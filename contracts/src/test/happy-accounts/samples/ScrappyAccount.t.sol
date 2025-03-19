// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTxTestUtils} from "../Utils.sol";
import {MockERC20} from "../../../mocks/MockERC20.sol";

import {HappyTx} from "../../../happy-accounts/core/HappyTx.sol";
import {HappyTxLib} from "../../../happy-accounts/libs/HappyTxLib.sol";

import {ScrappyAccount} from "../../../happy-accounts/samples/ScrappyAccount.sol";
import {
    ExecutionOutput,
    GasPriceTooHigh,
    WrongAccount,
    InvalidNonce,
    FutureNonceDuringSimulation
} from "../../../happy-accounts/interfaces/IHappyAccount.sol";
import {HappyEntryPoint} from "../../../happy-accounts/core/HappyEntryPoint.sol";

import {DeployHappyAAContracts} from "../../../deploy/DeployHappyAA.s.sol";
import {InvalidOwnerSignature, UnknownDuringSimulation} from "../../../happy-accounts/utils/Common.sol";

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

    address private happyEntryPoint;
    address private smartAccount;
    address private mockToken;
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

        happyEntryPoint = address(deployer.happyEntryPoint());
        smartAccount = deployer.scrappyAccountFactory().createAccount(SALT, owner);

        dest = deployer.scrappyAccountFactory().createAccount(SALT2, owner);

        // Fund the smart account
        vm.deal(smartAccount, INITIAL_DEPOSIT);

        // Deploy a mock ERC20 token
        mockToken = address(new MockERC20("MockTokenA", "MTA", uint8(18)));
    }

    // ====================================================================================================
    // VALIDATE TESTS

    function testValidateWrongAccount() public {
        // Create a happyTx with an invalid account field
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.account = ZERO_ADDRESS;
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        // Validate function must be called by the HappyEntryPoint
        vm.prank(happyEntryPoint);
        bytes4 validationData = ScrappyAccount(payable(smartAccount)).validate(happyTx);
        assertEq(validationData, WrongAccount.selector);
    }

    function testValidateGasPriceTooHigh() public {
        // Create a happyTx with a a maxFeePerGas lower than tx.gaslimit
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.maxFeePerGas = 1;
        happyTx.validatorData = signHappyTx(happyTx, privKey);
        vm.txGasPrice(2);

        // Validate function must be called by the HappyEntryPoint
        vm.prank(happyEntryPoint);
        bytes4 validationData = ScrappyAccount(payable(smartAccount)).validate(happyTx);
        assertEq(validationData, GasPriceTooHigh.selector);
    }

    // ====================================================================================================
    // NONCE VALIDATION TESTS

    function testValidateInvalidNonceStaleNonce() public {
        // First, increment the account's nonce by submitting a transaction
        _incrementAccountNonce();

        // Get the initial nonce
        uint64 origNonce = getNonceValue(smartAccount);

        // Create a happyTx with a nonce value less than the current nonce (negative nonceAhead)
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.nonceValue -= 1;
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        // Validate function must be called by the HappyEntryPoint
        vm.prank(happyEntryPoint);
        bytes4 validationData = ScrappyAccount(payable(smartAccount)).validate(happyTx);
        assertEq(validationData, InvalidNonce.selector);

        // Check that the once wasn't incremented
        uint64 newNonce = getNonceValue(smartAccount);
        assertEq(newNonce, origNonce);
    }

    function testValidateInvalidNonceFutureNonce() public {
        // Get the initial nonce
        uint64 origNonce = getNonceValue(smartAccount);

        // Create a happyTx with a nonce value greater than the current nonce (positive nonceAhead)
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.nonceValue += 1;
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        // Validate function must be called by the HappyEntryPoint
        vm.prank(happyEntryPoint);
        bytes4 validationData = ScrappyAccount(payable(smartAccount)).validate(happyTx);
        assertEq(validationData, InvalidNonce.selector);

        // Check that the once wasn't incremented
        uint64 newNonce = getNonceValue(smartAccount);
        assertEq(newNonce, origNonce);
    }

    function testNonceIncrementAfterSubmit() public {
        // Check initial nonce
        uint64 initialNonce = getNonceValue(smartAccount);
        assertEq(initialNonce, 0);

        // Submit a transaction to increment the nonce
        _incrementAccountNonce();

        // Check that the nonce was incremented
        uint64 newNonce = getNonceValue(smartAccount);
        assertEq(newNonce, 1);
    }

    // ====================================================================================================
    // NONCE VALIDATION TESTS (SIMULATION)

    function testValidateSimulationInvalidNonceStaleNonce() public {
        // First, increment the account's nonce by submitting a transaction
        _incrementAccountNonce();

        // Get the initial nonce
        uint64 origNonce = getNonceValue(smartAccount);

        // Create a happyTx with a nonce value less than the current nonce (negative nonceAhead)
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.nonceValue -= 1;
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        // Simulate a call from the entry point (tx.origin = address(0))
        vm.prank(happyEntryPoint, ZERO_ADDRESS);
        bytes4 validationData = ScrappyAccount(payable(smartAccount)).validate(happyTx);

        // Even in simulation mode, a stale nonce (nonceAhead < 0) should still fail
        assertEq(validationData, InvalidNonce.selector);

        // Check that the once wasn't incremented
        uint64 newNonce = getNonceValue(smartAccount);
        assertEq(newNonce, origNonce);
    }

    function testSimulationValidateFutureNonce() public {
        // Create a happyTx with a nonce value greater than the current nonce
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));

        // Set the happyTx nonce to be greater than the current nonce (which is 0)
        happyTx.nonceValue += 2;
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        uint256 id = vm.snapshotState();

        // First test in simulation mode - should be valid
        vm.prank(happyEntryPoint, ZERO_ADDRESS);
        bytes4 simulationValidationData = ScrappyAccount(payable(smartAccount)).validate(happyTx);
        assertEq(simulationValidationData, FutureNonceDuringSimulation.selector);

        vm.revertToState(id);

        // Now test in real mode - should fail with InvalidNonce
        vm.prank(happyEntryPoint);
        bytes4 realValidationData = ScrappyAccount(payable(smartAccount)).validate(happyTx);
        assertEq(realValidationData, InvalidNonce.selector); // Should fail in real mode
    }

    function testSimulationValidateCorrectNonce() public {
        // Create a happyTx with a nonce value equal to the current nonce
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        uint256 id = vm.snapshotState();

        // Simulate a call from the entry point (tx.origin = address(0))
        vm.prank(happyEntryPoint, ZERO_ADDRESS);
        bytes4 validationData = ScrappyAccount(payable(smartAccount)).validate(happyTx);

        // In simulation mode, a correct nonce should be valid
        assertEq(validationData, bytes4(0)); // Should be valid

        vm.revertToState(id);
    }

    // ====================================================================================================
    // SIGNATURE VALIDATION TESTS

    function testValidateEmptySignature() public {
        // Create a happyTx with an empty signature
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));

        // Validate function must be called by the HappyEntryPoint
        vm.prank(happyEntryPoint);

        // The function should revert with ValidationReverted(InvalidSignature.selector)
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InvalidSignature()"))));

        ScrappyAccount(payable(smartAccount)).validate(happyTx);
    }

    function testValidateInvalidSignatureLength() public {
        // Create a happyTx with a signature of invalid length
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.validatorData = hex"deadbeef";

        // Validate function must be called by the HappyEntryPoint
        vm.prank(happyEntryPoint);

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
        vm.prank(happyEntryPoint);

        // The function should revert with ValidationReverted(InvalidSignature.selector)
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("InvalidSignature()"))));

        ScrappyAccount(payable(smartAccount)).validate(happyTx);
    }

    function testValidateInvalidOwnerSignature() public {
        // Create a happyTx with a signature from a different owner
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.validatorData = signHappyTx(happyTx, DUMMY_PRIV_KEY);

        // Validate function must be called by the HappyEntryPoint
        vm.prank(happyEntryPoint);

        bytes4 validationData = ScrappyAccount(payable(smartAccount)).validate(happyTx);
        assertEq(validationData, InvalidOwnerSignature.selector);
    }

    // ====================================================================================================
    // SIGNATURE VALIDATION TESTS (SIMULATION)

    function testSimulationValidateUnknownDuringSimulation() public {
        // Create a happyTx with a signature from a different owner
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.validatorData = signHappyTx(happyTx, DUMMY_PRIV_KEY);

        // Validate function must be called by the HappyEntryPoint, with tx.origin = address(0)
        vm.prank(happyEntryPoint, ZERO_ADDRESS);

        bytes4 validationData = ScrappyAccount(payable(smartAccount)).validate(happyTx);
        assertEq(validationData, UnknownDuringSimulation.selector);
    }

    // ====================================================================================================
    // EXECUTION TESTS

    function testExecuteMintToken() public {
        uint256 initialTokenBalance = getTokenBalance(mockToken, dest);

        // Create a valid happyTx for minting mock tokens
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, smartAccount, mockToken, privKey);

        // Execute the transaction
        vm.prank(happyEntryPoint);
        ExecutionOutput memory output = ScrappyAccount(payable(smartAccount)).execute(happyTx);

        assertGt(output.gas, 0);
        assertTrue(output.success);
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
        vm.prank(happyEntryPoint);
        ExecutionOutput memory output = ScrappyAccount(payable(smartAccount)).execute(happyTx);

        assertGt(output.gas, 0);
        assertTrue(output.success);
        assertEq(output.revertData, new bytes(0));

        uint256 finalBalance = getEthBalance(dest);
        assertEq(finalBalance, initialBalance + happyTx.value);
    }

    function testExecuteInnerCallFails() public {
        uint256 initialTokenBalance = getTokenBalance(mockToken, dest);

        // Create a happyTx with wrong token address, so the call reverts
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, smartAccount, dest, privKey);

        // Execute the transaction
        vm.prank(happyEntryPoint);
        ExecutionOutput memory output = ScrappyAccount(payable(smartAccount)).execute(happyTx);

        assertEq(output.gas, 0);
        assertFalse(output.success);
        assertEq(output.revertData, new bytes(0));

        uint256 finalTokenBalance = getTokenBalance(mockToken, dest);
        assertEq(finalTokenBalance, initialTokenBalance);
    }

    // ====================================================================================================
    // PAYOUT TESTS

    function testPayoutWrongAccount() public {
        // Create a happyTx with an invalid account field
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.account = ZERO_ADDRESS;
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        // Payout function must be called by the HappyEntryPoint
        vm.prank(happyEntryPoint);
        bytes4 payoutData = ScrappyAccount(payable(smartAccount)).payout(happyTx, 0);
        assertEq(payoutData, WrongAccount.selector);
    }

    function testPayoutSuccessfulGasCalculation() public {
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));

        // Set up test parameters
        uint256 consumedGas = 100000;
        uint256 maxFeePerGas = happyTx.maxFeePerGas;
        int256 submitterFee = happyTx.submitterFee;

        // Calculate expected owed amount
        uint256 payoutIntrinsicGasOverhead = 400; // From ScrappyAccount.sol
        uint256 payoutPaymentOverheadGas = 9500; // From ScrappyAccount.sol

        int256 _owed =
            int256((consumedGas + payoutIntrinsicGasOverhead + payoutPaymentOverheadGas) * maxFeePerGas) + submitterFee;
        uint256 owed = _owed > 0 ? uint256(_owed) : 0;

        // Set up a test recipient address and record its initial balance
        address payable recipient = payable(address(0x123));
        uint256 initialBalance = recipient.balance;

        // Fund the smart account
        vm.deal(smartAccount, owed * 2); // Ensure enough funds

        // Mock tx.origin to be our test recipient
        vm.prank(happyEntryPoint, recipient);

        // Call payout
        bytes4 payoutData = ScrappyAccount(payable(smartAccount)).payout(happyTx, consumedGas);

        // Verify payout was successful
        assertEq(payoutData, bytes4(0));

        // Verify recipient received the correct amount
        assertEq(recipient.balance, initialBalance + owed);
    }

    function testPayoutZeroOwed() public {
        // Create a valid happyTx with negative submitterFee to force owed to be zero
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));

        // Set up to make the owed amount negative (which should result in 0 transfer)
        uint256 consumedGas = 100;
        happyTx.maxFeePerGas = 1; // Minimum gas price
        happyTx.submitterFee = -100000; // Large negative fee to ensure owed is negative
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        // Set up a test recipient address and record its initial balance
        address payable recipient = payable(address(0x123));
        uint256 initialBalance = recipient.balance;

        // Mock tx.origin to be our test recipient
        vm.prank(happyEntryPoint, recipient);

        // Call payout
        bytes4 payoutData = ScrappyAccount(payable(smartAccount)).payout(happyTx, consumedGas);

        // Verify payout was successful
        assertEq(payoutData, bytes4(0));

        // Verify recipient balance didn't change (owed should be 0)
        assertEq(recipient.balance, initialBalance);
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

        bytes4 happyAccountInterfaceId = 0x909c11f4; // IHappyAccount interface ID
        assertTrue(account.supportsInterface(happyAccountInterfaceId), "Should support IHappyAccount");

        bytes4 happyPaymasterInterfaceId = 0x9c7b367f; // IHappyPaymaster interface ID
        assertTrue(account.supportsInterface(happyPaymasterInterfaceId), "Should support IHappyPaymaster");
    }

    // ====================================================================================================
    // NONCE FUNCTION TESTS

    function testGetNonceWithExtremeTrackValues() public view {
        // Test with max uint192 value
        uint192 maxTrack = type(uint192).max;
        uint256 nonceValue = ScrappyAccount(payable(smartAccount)).getNonceValue(maxTrack);
        uint256 nonce = ScrappyAccount(payable(smartAccount)).getNonce(maxTrack);

        // Initial nonce value should be 0
        assertEq(nonceValue, 0);
        // getNonce should return track << 64 | nonceValue
        assertEq(nonce, uint256(maxTrack) << 64 | nonceValue);
    }

    // ====================================================================================================
    // HELPER FUNCTIONS

    function _incrementAccountNonce() internal {
        // Create a valid happyTx with the current nonce
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, smartAccount, mockToken, privKey);

        // Submit the transaction to increment the nonce
        HappyEntryPoint(payable(happyEntryPoint)).submit(happyTx.encode());
    }
}
