// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTxTestUtils} from "../Utils.sol";
import {MockERC20} from "../../../mocks/MockERC20.sol";

import {HappyTx} from "../../../happy-accounts/core/HappyTx.sol";
import {HappyTxLib} from "../../../happy-accounts/libs/HappyTxLib.sol";

import {ScrappyAccount} from "../../../happy-accounts/samples/ScrappyAccount.sol";
import {ExecutionOutput, FutureNonceDuringSimulation} from "../../../happy-accounts/interfaces/IHappyAccount.sol";
import {HappyEntryPoint, CallStatus} from "../../../happy-accounts/core/HappyEntryPoint.sol";

import {DeployHappyAAContracts} from "../../../deploy/DeployHappyAA.s.sol";
import {InvalidSignature, UnknownDuringSimulation} from "../../../happy-accounts/utils/Common.sol";

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

        happyEntryPoint = deployer.happyEntryPoint();
        _happyEntryPoint = address(happyEntryPoint);
        smartAccount = deployer.scrappyAccountFactory().createAccount(SALT, owner);

        dest = deployer.scrappyAccountFactory().createAccount(SALT2, owner);

        // Fund the smart account
        vm.deal(smartAccount, INITIAL_DEPOSIT);

        // Deploy a mock ERC20 token
        mockToken = address(new MockERC20("MockTokenA", "MTA", uint8(18)));
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
    // PAYOUT TESTS

    function testPayoutSuccessfulGasCalculation() public {
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));

        // Set up test parameters
        uint256 consumedGas = 100000;
        int256 submitterFee = happyTx.submitterFee;

        // Calculate expected owed amount
        uint256 payoutGas = 15_000; // From ScrappyAccount.sol
        int256 _owed = int256((consumedGas + payoutGas) * tx.gasprice) + submitterFee;
        uint256 owed = _owed > 0 ? uint256(_owed) : 0;

        // Set up a test recipient address and record its initial balance
        address payable recipient = payable(address(0x123));
        uint256 initialBalance = recipient.balance;

        // Fund the smart account
        vm.deal(smartAccount, owed * 2); // Ensure enough funds

        // Mock tx.origin to be our test recipient
        vm.prank(_happyEntryPoint, recipient);

        // Call payout
        bytes memory payoutData = ScrappyAccount(payable(smartAccount)).payout(happyTx, consumedGas);

        // Verify payout was successful
        assertEq(payoutData, abi.encodeWithSelector(bytes4(0)));

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
        vm.prank(_happyEntryPoint, recipient);

        // Call payout
        bytes memory payoutData = ScrappyAccount(payable(smartAccount)).payout(happyTx, consumedGas);

        // Verify payout was successful
        assertEq(payoutData, abi.encodeWithSelector(bytes4(0)));

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

        bytes4 happyAccountInterfaceId = 0x2b39e81f; // IHappyAccount interface ID
        assertTrue(account.supportsInterface(happyAccountInterfaceId), "Should support IHappyAccount");

        bytes4 happyPaymasterInterfaceId = 0x24542ca5; // IHappyPaymaster interface ID
        assertTrue(account.supportsInterface(happyPaymasterInterfaceId), "Should support IHappyPaymaster");
    }
}
