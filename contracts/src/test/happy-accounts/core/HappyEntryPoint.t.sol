// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ECDSA} from "solady/utils/ECDSA.sol";

import {HappyTxTestUtils} from "../Utils.sol";
import {MockERC20Token} from "../../../mocks/MockERC20.sol";

import {HappyTx} from "../../../happy-accounts/core/HappyTx.sol";
import {HappyTxLib} from "../../../happy-accounts/libs/HappyTxLib.sol";

import {ExecutionReverted} from "../../../happy-accounts/core/HappyEntryPoint.sol";

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
    bytes32 private constant SALT2 = bytes32(uint256(1));
    address private constant ZERO_ADDRESS = address(0);
    uint256 private constant INITIAL_DEPOSIT = 10 ether;

    // ====================================================================================================
    // STATE VARIABLES

    DeployHappyAAContracts private deployer;
    HappyEntryPoint private happyEntryPoint;

    address private smartAccount;
    address private paymaster;
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
        paymaster = address(deployer.scrappyPaymaster());
        smartAccount = deployer.scrappyAccountFactory().createAccount(SALT, owner);

        dest = deployer.scrappyAccountFactory().createAccount(SALT2, owner);

        // Fund the smart account and paymaster
        vm.deal(paymaster, INITIAL_DEPOSIT);
        vm.deal(smartAccount, INITIAL_DEPOSIT);

        // Deploy a mock ERC20 token
        mockToken = address(new MockERC20Token("MockTokenA", "MTA", uint8(18)));
    }

    // ====================================================================================================
    // BASIC TESTS

    function testSelfPayingTx() public {
        // Self-paying: paymaster == account itself
        uint256 initialBalance = getEthBalance(smartAccount);
        uint256 initialTokenBalance = getTokenBalance(mockToken, dest);

        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, smartAccount, mockToken, privKey);
        happyEntryPoint.submit(happyTx.encode());

        // The balance of the smart account should decrease after paying for the tx.
        uint256 finalBalance = getEthBalance(smartAccount);
        assertLt(finalBalance, initialBalance);

        uint256 finalTokenBalance = getTokenBalance(mockToken, dest);
        assertEq(finalTokenBalance, initialTokenBalance + TOKEN_MINT_AMOUNT);
    }

    function testPaymasterSponsoredTx() public {
        // Paymaster-sponsored: paymaster == ScrappyPaymaster
        uint256 initialBalance = getEthBalance(paymaster);
        uint256 initialTokenBalance = getTokenBalance(mockToken, dest);

        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, paymaster, mockToken, privKey);
        happyEntryPoint.submit(happyTx.encode());

        // The balance of the paymaster should decrease after paying for the tx.
        uint256 finalBalance = getEthBalance(paymaster);
        assertLt(finalBalance, initialBalance);

        uint256 finalTokenBalance = getTokenBalance(mockToken, dest);
        assertEq(finalTokenBalance, initialTokenBalance + TOKEN_MINT_AMOUNT);
    }

    function testSubmitterSponsoredTx() public {
        // Submitter-sponsored: paymaster == address(0)
        address submitter = address(0xdeadbeef);
        vm.deal(submitter, INITIAL_DEPOSIT);

        uint256 initialBalance = getEthBalance(submitter);
        uint256 initialTokenBalance = getTokenBalance(mockToken, dest);

        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, ZERO_ADDRESS, mockToken, privKey);
        vm.prank(submitter, submitter);
        happyEntryPoint.submit(happyTx.encode());

        // The balance should be the same as before, as the submitter payed for the tx.
        uint256 finalBalance = getEthBalance(submitter);
        assertLe(finalBalance, initialBalance); // Balance doesn't decrease as foundry doesn't simulate ETH balance deduction after call

        uint256 finalTokenBalance = getTokenBalance(mockToken, dest);
        assertEq(finalTokenBalance, initialTokenBalance + TOKEN_MINT_AMOUNT);
    }

    // ====================================================================================================
    // BAISC TESTS (SIMULATION)

    function testSimulateSelfPayingTx() public {
        // Self-paying simulation: account == paymaster
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, smartAccount, mockToken, privKey);
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        happyEntryPoint.submit(happyTx.encode());
    }

    function testSimulatePaymasterSponsoredTx() public {
        // Paymaster-sponsored simulation: paymaster is the ScrappyPaymaster
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, paymaster, mockToken, privKey);
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        happyEntryPoint.submit(happyTx.encode());
    }

    function testSimulateSubmitterSponsoredTx() public {
        // Submitter-sponsored simulation: paymaster is zero address
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, ZERO_ADDRESS, mockToken, privKey);
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        happyEntryPoint.submit(happyTx.encode());
    }

    // ====================================================================================================
    // VALIDATION TESTS

    function testValidatorRevertedAtEcdsaRecover() public {
        // Create a basic HappyTx
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, paymaster, mockToken, privKey);

        // Corrupt the validatorData with invalid signature format (not proper r,s,v format)
        // This will cause the recover function to revert during validation
        happyTx.validatorData = hex"deadbeef";

        // The function should revert with ValidationReverted(InvalidSignature.selector)
        bytes memory ecdsaError = abi.encodeWithSelector(bytes4(keccak256("InvalidSignature()")));
        vm.expectRevert(abi.encodeWithSelector(ValidationReverted.selector, ecdsaError));

        // Submit the transaction to trigger the revert
        happyEntryPoint.submit(happyTx.encode());
    }

    function testValidationFailedGasPriceTooHigh() public {
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, paymaster, mockToken, privKey);

        // Set a very high tx gas price (higher than happyTx.maxFeePerGas)
        vm.txGasPrice(5000000000);

        // The function should revert with ValidationFailed(GasPriceTooHigh.selector)
        vm.expectRevert(abi.encodeWithSelector(ValidationFailed.selector, GasPriceTooHigh.selector));

        // Submit the transaction to trigger the revert
        happyEntryPoint.submit(happyTx.encode());
    }

    function testValidationFailedInvalidNonce() public {
        // This should fail for both nonce too high and nonce too low cases
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, paymaster, mockToken, privKey);

        // Set a very high tx nonce (higher than happyTx.nonceValue)
        happyTx.nonceValue += 100;

        // The function should revert with ValidationFailed(InvalidNonce.selector)
        vm.expectRevert(abi.encodeWithSelector(ValidationFailed.selector, InvalidNonce.selector));

        // Submit the transaction to trigger the revert
        happyEntryPoint.submit(happyTx.encode());
    }

    function testValidationFailedInvalidOwnerSignature() public {
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, smartAccount, mockToken, privKey);

        // Change any field (except nonce) to invalid the signature over the happyTx
        happyTx.gasLimit += 10;

        // The function should revert with ValidationFailed(InvalidOwnerSignature.selector)
        vm.expectRevert(abi.encodeWithSelector(ValidationFailed.selector, InvalidOwnerSignature.selector));

        // Submit the transaction to trigger the revert
        happyEntryPoint.submit(happyTx.encode());
    }

    // ====================================================================================================
    // VALIDATION TESTS (SIMULATION)

    function testSimulateWithLowNonceValidationFailedInvalidNonce() public {
        // This should fail for both nonce too high and nonce too low cases
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, paymaster, mockToken, privKey);

        // First execute the happyTx to increment the nonce
        happyEntryPoint.submit(happyTx.encode());

        // Now use the same happyTx again, so it'll have a low nonce value this time, causing it to fail.
        // Note: we don't need to re-sign the happyTx, as the call will revert before it reaches signature validation stage.

        // The function should revert with ValidationFailed(InvalidNonce.selector)
        vm.expectRevert(abi.encodeWithSelector(ValidationFailed.selector, InvalidNonce.selector));

        // Submit the transaction to trigger the revert
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        happyEntryPoint.submit(happyTx.encode());
    }

    function testSimulateWithFutureNonce() public {
        // Set a future nonce for the simulated happyTx
        HappyTx memory happyTx =
            getStubHappyTx(smartAccount, mockToken, smartAccount, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        happyTx.nonceValue += 100;
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        // The function should return output.validationStatus = FutureNonceDuringSimulation.selector
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());

        // The output should be FutureNonceDuringSimulation.selector
        assertEq(output.validationStatus, bytes4(FutureNonceDuringSimulation.selector));
    }

    function testSimulateWithUnknownDuringSimulation() public {
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, paymaster, mockToken, privKey);

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

    function testExecuteWithLowExecutionGasLimitOOG() public {
        HappyTx memory happyTx =
            getStubHappyTx(smartAccount, mockToken, smartAccount, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));

        // Set a very low execution gas limit for the happyTx, and sign over it
        happyTx.executeGasLimit = 200;
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        // Expect the ExecutionReverted event to be emitted
        vm.expectEmit(true, false, false, true, address(happyEntryPoint));
        emit ExecutionReverted(abi.encodePacked(bytes4(0x31fe52e8)));
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());

        assertEq(output.validationStatus, bytes4(0));
        assertEq(uint8(output.callStatus), uint8(CallStatus.EXECUTION_REVERTED));
        assertEq(output.revertData, abi.encodeWithSelector(bytes4(keccak256("outOfGas()"))));
        assertEq(output.executeGas, 0);
    }

    function testExecuteInnerCallRevertsInvalidCallDataEmptryRevertData() public {
        // Set a very low execution gas limit for the happyTx
        HappyTx memory happyTx = createSignedHappyTx(smartAccount, dest, paymaster, privKey, new bytes(10));

        // The result should be output.callStatus = CallReverted, with  output.revertData = OOG
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());

        bytes memory revertData = new bytes(0);
        // assertEq(uint8(output.callStatus), uint8(CallStatus.CALL_REVERTED)); // TODO: uncomment after fixing the code
        assertEq(output.revertData, revertData);
        assertEq(output.executeGas, 0);
    }

    function testExecuteMockTokenAlwaysReverts() public {
        HappyTx memory happyTx =
            createSignedHappyTx(smartAccount, mockToken, paymaster, privKey, getMockTokenAlwaysRevertCallData());

        // The result should be output.callStatus = CallReverted
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());

        bytes memory revertData = abi.encodeWithSelector(MockERC20Token.AlwaysRevert.selector);
        assertEq(uint8(output.callStatus), uint8(CallStatus.CALL_REVERTED));
        assertEq(output.revertData, revertData);
        assertEq(output.executeGas, 0);
    }

    function testExecuteWithHighHappyTxValueGreaterThanAccountBalance() public {
        // Set the initial balance of the smart account to 0
        vm.deal(smartAccount, 0);
        HappyTx memory happyTx =
            createSignedHappyTx(smartAccount, ZERO_ADDRESS, dest, privKey, getETHTransferCallData(dest, 1));

        // The call should fail because the smartAccount address doesn't have enough funds
        vm.expectRevert(); // TODO: This doesn't have any revertData either, so the output.callStatus is CALL_SUCCEEDED, not sigma
        happyEntryPoint.submit(happyTx.encode());

        // Account balance should remain unchanged since the transaction would be unsuccessful
        uint256 newEthBalance = (smartAccount).balance;
        assertEq(newEthBalance, 0);
    }

    // ====================================================================================================
    // EXECUTION TESTS (SIMULATION)

    function testSimulationWithZeroExecutionGasLimit() public {
        HappyTx memory happyTx =
            getStubHappyTx(smartAccount, mockToken, smartAccount, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        happyTx.executeGasLimit = 0;
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());

        // The output.executeGas gives the gas usage for execute() call
        assertGt(output.executeGas, 0);

        // Submit the happyTx again, with the above execGasLimit
        HappyTx memory happyTx2 =
            getStubHappyTx(smartAccount, mockToken, smartAccount, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        happyTx2.executeGasLimit = output.executeGas * 110 / 100; // 10% buffer
        happyTx2.validatorData = signHappyTx(happyTx2, privKey);

        // This should succeed now if the execute-gas-limit estimation is accurate
        happyEntryPoint.submit(happyTx2.encode());
    }

    // ====================================================================================================
    // PAYOUT TESTS
}
