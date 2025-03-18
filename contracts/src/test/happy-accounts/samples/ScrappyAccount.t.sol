// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTxTestUtils} from "../Utils.sol";
import {MockERC20} from "../../../mocks/MockERC20.sol";

import {HappyTx} from "../../../happy-accounts/core/HappyTx.sol";
import {HappyTxLib} from "../../../happy-accounts/libs/HappyTxLib.sol";

import {ScrappyAccount} from "../../../happy-accounts/samples/ScrappyAccount.sol";
import {GasPriceTooHigh, WrongAccount, InvalidNonce} from "../../../happy-accounts/interfaces/IHappyAccount.sol";

import {DeployHappyAAContracts} from "../../../deploy/DeployHappyAA.s.sol";
import {HappyEntryPoint} from "../../../happy-accounts/core/HappyEntryPoint.sol";

contract ScrappyAccountTest is HappyTxTestUtils {
    using HappyTxLib for HappyTx;
    
    // ====================================================================================================
    // CONSTANTS

    bytes32 private constant SALT = 0;
    bytes32 private constant SALT2 = bytes32(uint256(1));
    address private constant ZERO_ADDRESS = address(0);
    uint256 private constant INITIAL_DEPOSIT = 10 ether;

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
        // Get the initial nonce
        uint64 origNonce = getNonceValue(smartAccount);
        // First, increment the account's nonce by submitting a transaction
        _incrementAccountNonce();

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
        // Create a happyTx with a nonce value greater than the current nonce (positive nonceAhead)
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.nonceValue += 1;
        happyTx.validatorData = signHappyTx(happyTx, privKey);
        
        // Validate function must be called by the HappyEntryPoint
        vm.prank(happyEntryPoint);
        bytes4 validationData = ScrappyAccount(payable(smartAccount)).validate(happyTx);
        assertEq(validationData, InvalidNonce.selector);
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
    // HELPER FUNCTIONS
    
    function _incrementAccountNonce() internal {
        // Create a valid happyTx with the current nonce
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, smartAccount, mockToken, privKey);
        
        // Submit the transaction to increment the nonce
        HappyEntryPoint(payable(happyEntryPoint)).submit(happyTx.encode());
    }
}
