// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ECDSA} from "solady/utils/ECDSA.sol";

import {HappyTxTestUtils} from "../Utils.sol";
import {MockERC20Token} from "../../../mocks/MockERC20.sol";

import {HappyTx} from "../../../happy-accounts/core/HappyTx.sol";
import {HappyTxLib} from "../../../happy-accounts/libs/HappyTxLib.sol";

import {DeployHappyAAContracts} from "../../../deploy/DeployHappyAA.s.sol";
import {InvalidOwnerSignature, UnknownDuringSimulation} from "../../../happy-accounts/utils/Common.sol";

import {
    FutureNonceDuringSimulation,
    GasPriceTooHigh,
    InvalidNonce
} from "../../../happy-accounts/interfaces/IHappyAccount.sol";
import {
    CallStatus,
    SubmitOutput,
    HappyEntryPoint,
    ValidationFailed,
    ValidationReverted
} from "../../../happy-accounts/core/HappyEntryPoint.sol";

contract HappyEntryPointTest is HappyTxTestUtils {
    using HappyTxLib for HappyTx;
    using ECDSA for bytes32;

    // ====================================================================================================
    // CONSTANTS

    bytes32 private constant SALT = 0;
    address private constant ZERO_ADDRESS = address(0);
    uint256 private constant DEPOSIT = 10 ether;

    // ====================================================================================================
    // STATE VARIABLES

    DeployHappyAAContracts private deployer;
    HappyEntryPoint private happyEntryPoint;

    address private smartAccount;
    address private paymaster;
    uint256 private privKey;
    address private owner;
    address private dest; // The mockToken address for these tests

    function setUp() public {
        privKey = uint256(vm.envBytes32("PRIVATE_KEY_LOCAL"));
        owner = vm.addr(privKey);

        // Set up the Deployment Script, and deploy the happy-aa contracts as foundry-account-0
        deployer = new DeployHappyAAContracts();
        vm.prank(owner);
        deployer.deployForTests();

        happyEntryPoint = deployer.happyEntryPoint();
        paymaster = address(deployer.scrappyPaymaster());
        smartAccount = deployer.scrappyAccountFactory().createAccount(SALT, owner);

        // Fund the smart account and paymaster
        vm.deal(paymaster, DEPOSIT);
        vm.deal(smartAccount, DEPOSIT);

        // Deploy a mock ERC20 token
        dest = address(new MockERC20Token("MockTokenA", "MTA", uint8(18)));
    }

    // ====================================================================================================
    // BASIC TESTS

    function testSelfPayingTx() public {
        // Self-paying: account == paymaster
        HappyTx memory happyTx = createSignedHappyTxForMint(smartAccount, smartAccount, dest, privKey);
        happyEntryPoint.submit(happyTx.encode());
    }

    function testPaymasterSponsoredTx() public {
        // Paymaster-sponsored: paymaster is the ScrappyPaymaster
        HappyTx memory happyTx = createSignedHappyTxForMint(smartAccount, paymaster, dest, privKey);
        happyEntryPoint.submit(happyTx.encode());
    }

    function testSubmitterSponsoredTx() public {
        // Submitter-sponsored: paymaster is zero address
        HappyTx memory happyTx = createSignedHappyTxForMint(smartAccount, ZERO_ADDRESS, dest, privKey);
        happyEntryPoint.submit(happyTx.encode());
    }

    // ====================================================================================================
    // BAISC TESTS (SIMULATION)

    function testSimulateSelfPayingTx() public {
        // Self-paying simulation: account == paymaster
        HappyTx memory happyTx = createSignedHappyTxForMint(smartAccount, smartAccount, dest, privKey);
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        happyEntryPoint.submit(happyTx.encode());
    }

    function testSimulatePaymasterSponsoredTx() public {
        // Paymaster-sponsored simulation: paymaster is the ScrappyPaymaster
        HappyTx memory happyTx = createSignedHappyTxForMint(smartAccount, paymaster, dest, privKey);
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        happyEntryPoint.submit(happyTx.encode());
    }

    function testSimulateSubmitterSponsoredTx() public {
        // Submitter-sponsored simulation: paymaster is zero address
        HappyTx memory happyTx = createSignedHappyTxForMint(smartAccount, ZERO_ADDRESS, dest, privKey);
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        happyEntryPoint.submit(happyTx.encode());
    }

    // ====================================================================================================
    // VALIDATION TESTS

    function testValidatorRevertedRecover() public {
        // Create a basic HappyTx
        HappyTx memory happyTx = createSignedHappyTxForMint(smartAccount, ZERO_ADDRESS, dest, privKey);

        // Corrupt the validatorData with invalid signature format (not proper r,s,v format)
        // This will cause the recover function to revert during validation
        happyTx.validatorData = hex"deadbeef";

        bytes memory ecdsaError = abi.encodeWithSelector(bytes4(keccak256("InvalidSignature()")));

        // The function should revert with ValidationReverted(InvalidSignature.selector)
        vm.expectRevert(abi.encodeWithSelector(ValidationReverted.selector, ecdsaError));

        // Submit the transaction to trigger the revert
        happyEntryPoint.submit(happyTx.encode());
    }

    function testValidationFailedGasPriceTooHigh() public {
        HappyTx memory happyTx = createSignedHappyTxForMint(smartAccount, paymaster, dest, privKey);

        // Set a very high tx gas price (higher than happyTx.maxFeePerGas)
        vm.txGasPrice(5000000000);

        // The function should revert with ValidationFailed(GasPriceTooHigh.selector)
        vm.expectRevert(abi.encodeWithSelector(ValidationFailed.selector, GasPriceTooHigh.selector));

        // Submit the transaction to trigger the revert
        happyEntryPoint.submit(happyTx.encode());
    }

    function testValidationFailedInvalidNonce() public {
        // This should fail for both nonce too high and nonce too low cases
        HappyTx memory happyTx = createSignedHappyTxForMint(smartAccount, paymaster, dest, privKey);

        // Set a very high tx nonce (higher than happyTx.nonceValue)
        happyTx.nonceValue += 100;

        // The function should revert with ValidationFailed(InvalidNonce.selector)
        vm.expectRevert(abi.encodeWithSelector(ValidationFailed.selector, InvalidNonce.selector));

        // Submit the transaction to trigger the revert
        happyEntryPoint.submit(happyTx.encode());
    }

    function testValidationFailedInvalidOwnerSignature() public {
        HappyTx memory happyTx = createSignedHappyTxForMint(smartAccount, paymaster, dest, privKey);

        // Change any field to invalid the signature over the happyTx
        happyTx.paymaster = ZERO_ADDRESS;

        // The function should revert with ValidationFailed(InvalidOwnerSignature.selector)
        vm.expectRevert(abi.encodeWithSelector(ValidationFailed.selector, InvalidOwnerSignature.selector));

        // Submit the transaction to trigger the revert
        happyEntryPoint.submit(happyTx.encode());
    }

    // ====================================================================================================
    // VALIDATION TESTS (SIMULATION)

    function testSimulateWithLowNonceValidationFailedInvalidNonce() public {
        // This should fail for both nonce too high and nonce too low cases
        HappyTx memory happyTx = createSignedHappyTxForMint(smartAccount, paymaster, dest, privKey);

        // First execute the happyTx to increment the nonce
        happyEntryPoint.submit(happyTx.encode());

        // Now use the same happyTx again, so it'll have a low nonce value this time

        // The function should revert with ValidationFailed(InvalidNonce.selector)
        vm.expectRevert(abi.encodeWithSelector(ValidationFailed.selector, InvalidNonce.selector));

        // Submit the transaction to trigger the revert
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        happyEntryPoint.submit(happyTx.encode());
    }

    function testSimulateWithFutureNonce() public {
        // Set a future nonce for the simulated happyTx
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, getMintCallData(dest));
        happyTx.nonceValue = 100;
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        // The function should return output.validationStatus = FutureNonceDuringSimulation.selector
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());

        // The output should be FutureNonceDuringSimulation.selector
        assertEq(output.validationStatus, bytes4(FutureNonceDuringSimulation.selector));
    }

    function testSimulateWithUnknownDuringSimulation() public {
        HappyTx memory happyTx = createSignedHappyTxForMint(smartAccount, paymaster, dest, privKey);

        // Change any field to invalid the signature over the happyTx
        happyTx.paymaster = ZERO_ADDRESS;

        // The function should return output.validationStatus = UnknownDuringSimulation.selector
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());

        // The output should be UnknownDuringSimulation.selector
        assertEq(output.validationStatus, bytes4(UnknownDuringSimulation.selector));
    }

    // ====================================================================================================
    // EXECUTION TESTS

    function testExecuteWithLowExecutionGasLimitExcessivelySafeCallReverts() public {
        // Set a very low execution gas limit for the happyTx
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, getMintCallData(dest));
        happyTx.executeGasLimit = 2000;
        happyTx.nonceValue = getNonce(smartAccount, 0);
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        // EVMError OOG causes the submit() function to revert as well
        // TODO: I though ExcessivelySafeCall was supposed to catch all reverts, even if it's OOG
        vm.expectRevert();
        happyEntryPoint.submit(happyTx.encode());
    }

    function testExecuteInnerCallRevertsInvalidCallData() public {
        // Set a very low execution gas limit for the happyTx
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(10));
        happyTx.nonceValue = getNonce(smartAccount, 0);
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        // The result should be output.callStatus = CallReverted, with  output.revertData = OOG
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());

        bytes memory revertData = new bytes(0);
        assertEq(uint8(output.callStatus), uint8(CallStatus.CALL_REVERTED));
        assertEq(output.revertData, revertData);
        assertEq(output.executeGas, 0);
    }

    function testExecuteWithHighHappyTxValueGreaterThanAccountBalance() public {
        HappyTx memory happyTx =
            createSignedHappyTx(smartAccount, dest, smartAccount, privKey, getETHTransferCallData(dest));

        // The call should fail because the smartAccount address doesn't have enough funds
        vm.expectRevert();
        happyEntryPoint.submit(happyTx.encode());
    }

    // ====================================================================================================
    // EXECUTION TESTS (SIMULATION)

    // ====================================================================================================
    // PAYOUT TESTS
}
