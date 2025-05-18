// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyPaymaster} from "boop/happychain/HappyPaymaster.sol";
import {NotFromEntryPoint} from "boop/interfaces/EventsAndErrors.sol";
import {SubmitterFeeTooHigh} from "boop/interfaces/IPaymaster.sol";
import {Boop} from "boop/interfaces/Types.sol";
import {Ownable} from "openzeppelin/access/Ownable.sol";
import {DeployBoopContracts} from "src/deploy/DeployBoop.s.sol";
import {BoopTestUtils} from "src/test/boop/Utils.sol";

contract HappyPaymasterTest is BoopTestUtils {
    // ====================================================================================================
    // CONSTANTS

    bytes32 private constant SALT = 0;
    bytes32 private constant SALT2 = bytes32(uint256(1));
    address private constant ZERO_ADDRESS = address(0);
    address payable private constant RECIPIENT = payable(address(0x123));
    uint256 private constant INITIAL_DEPOSIT = 10 ether;

    // ====================================================================================================
    // STATE VARIABLES

    DeployBoopContracts private deployer;

    address private _entryPoint;
    address private smartAccount;
    address private _paymaster;
    uint256 private privKey;
    address private owner;
    address private dest;
    HappyPaymaster private paymaster;

    function setUp() public {
        privKey = uint256(vm.envBytes32("PRIVATE_KEY_LOCAL"));
        owner = vm.addr(privKey);

        deployer = new DeployBoopContracts();
        deployer.deployForTests();

        entryPoint = deployer.entryPoint();
        _entryPoint = address(entryPoint);
        smartAccount = deployer.happyAccountBeaconProxyFactory().createAccount(SALT, owner);

        dest = deployer.happyAccountBeaconProxyFactory().createAccount(SALT2, owner);

        paymaster = HappyPaymaster(deployer.happyPaymaster());
        _paymaster = address(paymaster);

        // Fund the paymaster
        vm.deal(_paymaster, INITIAL_DEPOSIT);
    }

    // ====================================================================================================
    // PAYMENT VALIDATION TESTS

    function testPaymentValidationZeroOwed() public {
        // Create a valid boop with negative submitterFee to force owed to be zero
        Boop memory boop = getStubBoop(smartAccount, dest, _paymaster, new bytes(0));

        // Set up to make the owed amount negative (which should result in 0 transfer)
        boop.maxFeePerGas = 1; // Minimum gas price
        boop.submitterFee = -1000000; // Large negative fee to ensure owed is negative

        // Call validatePayment from the entrypoint
        vm.prank(_entryPoint);
        bytes memory validationData = paymaster.validatePayment(boop);

        // Verify validation was successful (returns empty selector)
        assertEq(validationData, abi.encodeWithSelector(bytes4(0)));
    }

    function testPaymentValidationRevertsWhenNotCalledThroughEntrypoint() public {
        // Create a valid boop
        Boop memory boop = getStubBoop(smartAccount, dest, _paymaster, new bytes(0));

        // Call validatePayment from an address that is not the entrypoint
        // This should revert with NotFromEntryPoint error
        vm.expectRevert(NotFromEntryPoint.selector);
        paymaster.validatePayment(boop);
    }

    function testPaymentValidationSubmitterFeeTooHigh() public {
        // Create a valid boop with high submitterFee
        Boop memory boop = getStubBoop(smartAccount, dest, _paymaster, new bytes(0));

        // Set a very high submitter fee
        boop.submitterFee = type(int256).max;

        // Call validatePayment from the entrypoint
        vm.prank(_entryPoint);
        bytes memory validationData = paymaster.validatePayment(boop);

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
        vm.deal(_paymaster, withdrawAmount);
        uint256 initialPaymasterBalance = address(_paymaster).balance;

        // Call withdraw as owner
        vm.prank(owner);
        paymaster.withdraw(RECIPIENT, withdrawAmount);

        // Verify balances after withdrawal
        assertEq(address(_paymaster).balance, initialPaymasterBalance - withdrawAmount);
        assertEq(RECIPIENT.balance, initialRecipientBalance + withdrawAmount);
    }

    function testWithdrawInsufficientBalance() public {
        // Set up test parameters
        uint256 paymasterBalance = 1 ether;
        uint256 withdrawAmount = 2 ether; // More than available

        // Fund the paymaster
        vm.deal(_paymaster, paymasterBalance);

        // Call withdraw as owner with amount > balance
        vm.prank(owner);
        vm.expectRevert("Insufficient balance");
        paymaster.withdraw(RECIPIENT, withdrawAmount);
    }

    function testWithdrawOnlyOwner() public {
        // Set up test parameters
        uint256 withdrawAmount = 1 ether;

        // Fund the paymaster
        vm.deal(_paymaster, withdrawAmount);

        // Call withdraw as non-owner
        address nonOwner = address(0x456);
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, nonOwner));
        paymaster.withdraw(RECIPIENT, withdrawAmount);
    }

    // ====================================================================================================
    // GAS BUDGET TESTS

    function testFreshUserHasMaxBudget() public view {
        uint32 budget = paymaster.getBudget(smartAccount);
        assertEq(budget, uint32(paymaster.MAX_GAS_BUDGET()));
    }

    function testValidatePaymentUpdatesBudget() public {
        // Trigger a valid payment to store budget
        Boop memory boop = getStubBoop(smartAccount, dest, _paymaster, new bytes(0));
        boop.maxFeePerGas = 1;
        boop.gasLimit = 100_000;
        boop.submitterFee = 0;
        vm.prank(_entryPoint);
        paymaster.validatePayment(boop);
        uint32 budget = paymaster.getBudget(smartAccount);
        assertLt(budget, uint32(paymaster.MAX_GAS_BUDGET()));
    }
}
