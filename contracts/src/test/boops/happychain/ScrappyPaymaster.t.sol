// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTxTestUtils} from "../Utils.sol";
import {HappyTx} from "boop/core/HappyTx.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {DeployHappyAAContracts} from "../../../deploy/DeployHappyAA.s.sol";

import {ScrappyPaymaster} from "boop/samples/ScrappyPaymaster.sol";
import {SubmitterFeeTooHigh} from "boop/interfaces/IHappyPaymaster.sol";
import {NotFromEntryPoint} from "boop/utils/Common.sol";

contract ScrappyPaymasterTest is HappyTxTestUtils {
    // ====================================================================================================
    // CONSTANTS

    bytes32 private constant SALT = 0;
    bytes32 private constant SALT2 = bytes32(uint256(1));
    address private constant ZERO_ADDRESS = address(0);
    address payable private constant RECIPIENT = payable(address(0x123));
    uint256 private constant INITIAL_DEPOSIT = 10 ether;

    // ====================================================================================================
    // STATE VARIABLES

    DeployHappyAAContracts private deployer;

    address private _happyEntryPoint;
    address private smartAccount;
    address private paymaster;
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

        paymaster = address(deployer.scrappyPaymaster());

        // Fund the paymaster
        vm.deal(paymaster, INITIAL_DEPOSIT);
    }

    // ====================================================================================================
    // PAYMENT VALIDATION TESTS

    function testPaymentValidationZeroOwed() public {
        // Create a valid happyTx with negative submitterFee to force owed to be zero
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, paymaster, new bytes(0));

        // Set up to make the owed amount negative (which should result in 0 transfer)
        happyTx.maxFeePerGas = 1; // Minimum gas price
        happyTx.submitterFee = -1000000; // Large negative fee to ensure owed is negative

        // Call validatePayment from the entrypoint
        vm.prank(_happyEntryPoint);
        bytes memory validationData = ScrappyPaymaster(payable(paymaster)).validatePayment(happyTx);

        // Verify validation was successful (returns empty selector)
        assertEq(validationData, abi.encodeWithSelector(bytes4(0)));
    }

    function testPaymentValidationRevertsWhenNotCalledThroughEntrypoint() public {
        // Create a valid happyTx
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, paymaster, new bytes(0));

        // Call validatePayment from an address that is not the entrypoint
        // This should revert with NotFromEntryPoint error
        vm.expectRevert(NotFromEntryPoint.selector);
        ScrappyPaymaster(payable(paymaster)).validatePayment(happyTx);
    }

    function testPaymentValidationSubmitterFeeTooHigh() public {
        // Create a valid happyTx with high submitterFee
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, paymaster, new bytes(0));

        // Set a very high submitter fee
        happyTx.submitterFee = type(int256).max;

        // Call validatePayment from the entrypoint
        vm.prank(_happyEntryPoint);
        bytes memory validationData = ScrappyPaymaster(payable(paymaster)).validatePayment(happyTx);

        // Verify correct error code is returned
        assertEq(validationData, abi.encodeWithSelector(SubmitterFeeTooHigh.selector));
    }

    // ====================================================================================================
    // WITHDRAW TESTS

    function testWithdrawSuccessful() public {
        // Set up test parameters
        uint256 initialRecipientBalance = RECIPIENT.balance;
        uint256 withdrawAmount = 1 ether;

        // Fund the paymaster
        vm.deal(paymaster, withdrawAmount);
        uint256 initialPaymasterBalance = address(paymaster).balance;

        // Call withdraw as owner
        vm.prank(owner);
        ScrappyPaymaster(payable(paymaster)).withdraw(RECIPIENT, withdrawAmount);

        // Verify balances after withdrawal
        assertEq(address(paymaster).balance, initialPaymasterBalance - withdrawAmount);
        assertEq(RECIPIENT.balance, initialRecipientBalance + withdrawAmount);
    }

    function testWithdrawInsufficientBalance() public {
        // Set up test parameters
        uint256 paymasterBalance = 1 ether;
        uint256 withdrawAmount = 2 ether; // More than available

        // Fund the paymaster
        vm.deal(paymaster, paymasterBalance);

        // Call withdraw as owner with amount > balance
        vm.prank(owner);
        vm.expectRevert("Insufficient balance");
        ScrappyPaymaster(payable(paymaster)).withdraw(RECIPIENT, withdrawAmount);
    }

    function testWithdrawOnlyOwner() public {
        // Set up test parameters
        uint256 withdrawAmount = 1 ether;

        // Fund the paymaster
        vm.deal(paymaster, withdrawAmount);

        // Call withdraw as non-owner
        address nonOwner = address(0x456);
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, nonOwner));
        ScrappyPaymaster(payable(paymaster)).withdraw(RECIPIENT, withdrawAmount);
    }
}
