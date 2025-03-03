// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {MockERC20Token} from "../../../mocks/MockERC20.sol";
import {HappyTxTestUtils} from "../Utils.sol";

import {HappyTx} from "../../../happy-accounts/core/HappyTx.sol";
import {HappyTxLib} from "../../../happy-accounts/libs/HappyTxLib.sol";

import {HappyEntryPoint, ValidationReverted} from "../../../happy-accounts/core/HappyEntryPoint.sol";
import {ScrappyAccount} from "../../../happy-accounts/samples/ScrappyAccount.sol";
import {ScrappyPaymaster} from "../../../happy-accounts/samples/ScrappyPaymaster.sol";
import {ScrappyAccountFactory} from "../../../happy-accounts/factories/ScrappyAccountFactory.sol";

import {DeployHappyAAContracts} from "../../../deploy/DeployHappyAA.s.sol";

contract HappyEntryPointTest is Test {
    using HappyTxLib for HappyTx;
    using MessageHashUtils for bytes32;

    // ====================================================================================================
    // CONSTANTS

    bytes32 private constant SALT = 0x0000000000000000000000000000000000000000000000000000000000000000;
    address private constant ZERO_ADDRESS = address(0);
    uint256 private constant DEPOSIT = 10 ether;

    // ====================================================================================================
    // STATE VARIABLES

    DeployHappyAAContracts private deployer;
    HappyTxTestUtils private utils;

    HappyEntryPoint private happyEntryPoint;
    ScrappyAccount private scrappyAccount;
    ScrappyPaymaster private scrappyPaymaster;
    ScrappyAccountFactory private scrappyAccountFactory;

    address private smartAccount;
    address private paymaster;
    address private mockToken;
    uint256 private privKey;
    address private owner;
    address private dest;

    function setUp() public {
        privKey = uint256(vm.envBytes32("PRIVATE_KEY_LOCAL"));
        owner = vm.addr(privKey);

        // Set up the utils
        utils = new HappyTxTestUtils();

        // Set up the Deployment Script
        deployer = new DeployHappyAAContracts();

        // Deploy the happy-aa contracts as foundry-account-0
        vm.prank(owner);
        deployer.deployForTests();

        happyEntryPoint = deployer.happyEntryPoint();
        scrappyPaymaster = deployer.scrappyPaymaster();
        scrappyAccountFactory = deployer.scrappyAccountFactory();

        smartAccount = scrappyAccountFactory.createAccount(SALT, owner);
        paymaster = address(scrappyPaymaster);

        // Fund the smart account and paymaster
        vm.deal(smartAccount, DEPOSIT);
        vm.deal(paymaster, DEPOSIT);

        mockToken = address(new MockERC20Token("MockTokenA", "MTA", uint8(18)));
        dest = mockToken;
    }

    // ====================================================================================================
    // BASIC TESTS

    function testSelfPayingTx() public {
        // Self-paying: account == paymaster
        HappyTx memory happyTx = utils.createSignedHappyTx(smartAccount, smartAccount, dest, privKey);
        happyEntryPoint.submit(happyTx.encode());
    }

    function testPaymasterSponsoredTx() public {
        // Paymaster-sponsored: paymaster is the ScrappyPaymaster
        HappyTx memory happyTx = utils.createSignedHappyTx(smartAccount, paymaster, dest, privKey);
        happyEntryPoint.submit(happyTx.encode());
    }

    function testSubmitterSponsoredTx() public {
        // Submitter-sponsored: paymaster is zero address
        HappyTx memory happyTx = utils.createSignedHappyTx(smartAccount, ZERO_ADDRESS, dest, privKey);
        happyEntryPoint.submit(happyTx.encode());
    }

    // ====================================================================================================
    // BAISC SIMULATION TESTS

    function testSimulateSelfPayingTx() public {
        // Self-paying simulation: account == paymaster
        HappyTx memory happyTx = utils.createSignedHappyTx(smartAccount, smartAccount, dest, privKey);
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        happyEntryPoint.submit(happyTx.encode());
    }

    function testSimulatePaymasterSponsoredTx() public {
        // Paymaster-sponsored simulation: paymaster is the ScrappyPaymaster
        HappyTx memory happyTx = utils.createSignedHappyTx(smartAccount, paymaster, dest, privKey);
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        happyEntryPoint.submit(happyTx.encode());
    }

    function testSimulateSubmitterSponsoredTx() public {
        // Submitter-sponsored simulation: paymaster is zero address
        HappyTx memory happyTx = utils.createSignedHappyTx(smartAccount, ZERO_ADDRESS, dest, privKey);
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        happyEntryPoint.submit(happyTx.encode());
    }

    // ====================================================================================================
    // VALIDATION TESTS

    function testValidatorReverts() public {
        // Create a basic HappyTx
        HappyTx memory happyTx = utils.createSignedHappyTx(smartAccount, ZERO_ADDRESS, dest, privKey);

        // Corrupt the validatorData with invalid signature format (not proper r,s,v format)
        // This will cause the recover function to revert during validation
        happyTx.validatorData = hex"deadbeef";

        bytes memory ecdsaLibError = abi.encodeWithSelector(
            bytes4(keccak256("ECDSAInvalidSignatureLength(uint256)")),
            4 // length of "deadbeef"
        );

        // The validation should revert when we submit this transaction
        vm.expectRevert(abi.encodeWithSelector(ValidationReverted.selector, ecdsaLibError));

        // Submit the transaction to trigger the revert
        happyEntryPoint.submit(happyTx.encode());
    }

    function testSimulationWithLowNonce() public {}

    // ====================================================================================================
    // EXECUTION TESTS

    // ====================================================================================================
    // PAYOUT TESTS
}
