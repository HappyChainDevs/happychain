// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTxTestUtils} from "../Utils.sol";
import {MockERC20} from "../../../mocks/MockERC20.sol";

import {HappyTx} from "../../../happy-accounts/core/HappyTx.sol";
import {HappyTxLib} from "../../../happy-accounts/libs/HappyTxLib.sol";

import {ScrappyAccount} from "../../../happy-accounts/samples/ScrappyAccount.sol";
import {
    GasPriceTooHigh,
    WrongAccount,
    InvalidNonce,
    FutureNonceDuringSimulation
} from "../../../happy-accounts/interfaces/IHappyAccount.sol";
import {HappyEntryPoint} from "../../../happy-accounts/core/HappyEntryPoint.sol";

import {DeployHappyAAContracts} from "../../../deploy/DeployHappyAA.s.sol";
import {InvalidOwnerSignature} from "../../../happy-accounts/utils/Common.sol";

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

    function testSimulationValidateEmptySignature() public {}

    function testSimulationValidateInvalidSignatureLength() public {}

    function testSimulationValidateInvalidSignature() public {}

    // ====================================================================================================
    // HELPER FUNCTIONS

    function _incrementAccountNonce() internal {
        // Create a valid happyTx with the current nonce
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, smartAccount, mockToken, privKey);

        // Submit the transaction to increment the nonce
        HappyEntryPoint(payable(happyEntryPoint)).submit(happyTx.encode());
    }
}
