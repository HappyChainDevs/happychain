// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ECDSA} from "solady/utils/ECDSA.sol";

import {HappyTxTestUtils} from "../Utils.sol";
import {MockERC20} from "../../../mocks/MockERC20.sol";
import {MockRevert} from "../../../mocks/MockRevert.sol";

import {HappyTx} from "../../../happy-accounts/core/HappyTx.sol";
import {HappyTxLib} from "../../../happy-accounts/libs/HappyTxLib.sol";

import {SubmitterFeeTooHigh} from "../../../happy-accounts/interfaces/IHappyPaymaster.sol";

import {DeployHappyAAContracts} from "../../../deploy/DeployHappyAA.s.sol";
import {InvalidSignature} from "../../../happy-accounts/utils/Common.sol";

import {
    CallStatus,
    SubmitOutput,
    InsufficientStake,
    PaymentValidationFailed,
    PaymentValidationReverted,
    PayoutFailed,
    ValidationFailed,
    ValidationReverted,
    GasPriceTooHigh,
    InvalidNonce
} from "../../../happy-accounts/core/HappyEntryPoint.sol";

import {console} from "forge-std/console.sol";

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

    address private smartAccount;
    address private paymaster;
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
        paymaster = address(deployer.scrappyPaymaster());
        smartAccount = deployer.scrappyAccountFactory().createAccount(SALT, owner);

        dest = deployer.scrappyAccountFactory().createAccount(SALT2, owner);

        // Fund the smart account and paymaster
        vm.deal(paymaster, INITIAL_DEPOSIT);
        vm.deal(smartAccount, INITIAL_DEPOSIT);

        // Stake the paymaster
        vm.prank(paymaster);
        happyEntryPoint.deposit{value: INITIAL_DEPOSIT}();

        // Deploy the mock contracts
        mockToken = address(new MockERC20("MockTokenA", "MTA", uint8(18)));
        mockRevert = address(new MockRevert());
    }

    // ====================================================================================================
    // BASIC TESTS

    function testSelfPayingTx() public {
        // Self-paying: paymaster == account itself
        uint256 initialBalance = getEthBalance(smartAccount);
        uint256 initialTokenBalance = getTokenBalance(mockToken, dest);

        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, smartAccount, mockToken, privKey);
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.SUCCEEDED, new bytes(0));

        // The balance of the smart account should decrease after paying for the tx.
        uint256 finalBalance = getEthBalance(smartAccount);
        assertLt(finalBalance, initialBalance);

        uint256 finalTokenBalance = getTokenBalance(mockToken, dest);
        assertEq(finalTokenBalance, initialTokenBalance + TOKEN_MINT_AMOUNT);
    }

    function testPaymasterSponsoredTx() public {
        // Paymaster-sponsored: paymaster == ScrappyPaymaster
        uint256 initialStake = happyEntryPoint.balanceOf(paymaster);
        uint256 initialTokenBalance = getTokenBalance(mockToken, dest);

        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, paymaster, mockToken, privKey);
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.SUCCEEDED, new bytes(0));

        // The balance of the paymaster should decrease after paying for the tx.
        uint256 finalStake = happyEntryPoint.balanceOf(paymaster);
        assertLt(finalStake, initialStake);

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
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.SUCCEEDED, new bytes(0));

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
        uint256 id = vm.snapshotState();

        uint256 initialBalance = getEthBalance(smartAccount);
        uint256 initialTokenBalance = getTokenBalance(mockToken, dest);

        HappyTx memory happyTx =
            getStubHappyTx(smartAccount, mockToken, smartAccount, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        happyTx.gasLimit = 0;
        happyTx.executeGasLimit = 0;
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.SUCCEEDED, new bytes(0));

        vm.revertToState(id); // EVM state is like before the .submit() call

        // The balance should be the same as before, as this was a simulated call, not actually submitted on-chain
        uint256 finalBalance = getEthBalance(smartAccount);
        assertEq(finalBalance, initialBalance);

        uint256 finalTokenBalance = getTokenBalance(mockToken, dest);
        assertEq(finalTokenBalance, initialTokenBalance);
    }

    function testSimulatePaymasterSponsoredTx() public {
        // Paymaster-sponsored simulation: paymaster is the ScrappyPaymaster
        uint256 id = vm.snapshotState();

        uint256 initialStake = happyEntryPoint.balanceOf(paymaster);
        uint256 initialTokenBalance = getTokenBalance(mockToken, dest);

        HappyTx memory happyTx =
            getStubHappyTx(smartAccount, mockToken, paymaster, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        happyTx.gasLimit = 0;
        happyTx.executeGasLimit = 0;
        happyTx.maxFeePerGas = 0;
        happyTx.submitterFee = 0;
        happyTx.validatorData = signHappyTx(happyTx, privKey);
        happyTx.maxFeePerGas = 1200000000;

        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.SUCCEEDED, new bytes(0));

        vm.revertToState(id); // EVM state is like before the .submit() call

        // The balance should be the same as before, as this was a simulated call, not actually submitted on-chain
        uint256 finalStake = happyEntryPoint.balanceOf(paymaster);
        assertEq(finalStake, initialStake);

        uint256 finalTokenBalance = getTokenBalance(mockToken, dest);
        assertEq(finalTokenBalance, initialTokenBalance);
    }

    function testSimulateSubmitterSponsoredTx() public {
        // Submitter-sponsored simulation: paymaster is zero address
        uint256 id = vm.snapshotState();

        uint256 initialBalance = getEthBalance(smartAccount);
        uint256 initialTokenBalance = getTokenBalance(mockToken, dest);

        HappyTx memory happyTx =
            getStubHappyTx(smartAccount, mockToken, ZERO_ADDRESS, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        happyTx.gasLimit = 0;
        happyTx.executeGasLimit = 0;
        happyTx.maxFeePerGas = 0;
        happyTx.submitterFee = 0;
        happyTx.validatorData = signHappyTx(happyTx, privKey);
        happyTx.maxFeePerGas = 1200000000;

        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.SUCCEEDED, new bytes(0));

        vm.revertToState(id); // EVM state is like before the .submit() call

        // The balance should be the same as before, as this was a simulated call, not actually submitted on-chain
        uint256 finalBalance = getEthBalance(smartAccount);
        assertEq(finalBalance, initialBalance);

        uint256 finalTokenBalance = getTokenBalance(mockToken, dest);
        assertEq(finalTokenBalance, initialTokenBalance);
    }

    // ====================================================================================================
    // ENTRYPOINT PRE-VALIDATION TESTS

    function testGasPriceTooHigh() public {
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, paymaster, mockToken, privKey);
        vm.txGasPrice(happyTx.maxFeePerGas * 2);
        vm.expectRevert(GasPriceTooHigh.selector);
        happyEntryPoint.submit(happyTx.encode());
    }

    function testInsufficientStake() public {
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, paymaster, mockToken, privKey);
        happyTx.paymaster = dest; // An address which hasn't staked to the entrypoint
        vm.txGasPrice(happyTx.maxFeePerGas / 2);
        vm.expectRevert(InsufficientStake.selector);
        happyEntryPoint.submit(happyTx.encode());
    }

    // ====================================================================================================
    // NONCE VALIDATION TESTS

    function testInvalidNonceStaleNonce() public {
        // First, increment the account's nonce by submitting a transaction
        _incrementAccountNonce();

        // Get the initial nonce
        uint64 origNonce = uint64(happyEntryPoint.nonceValues(smartAccount, DEFAULT_NONCETRACK));

        // Create a happyTx with a nonce value less than the current nonce (negative nonceAhead)
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.nonceValue -= 1;
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        vm.expectRevert(InvalidNonce.selector);
        happyEntryPoint.submit(happyTx.encode());

        // Check that the once wasn't incremented
        uint64 newNonce = uint64(happyEntryPoint.nonceValues(smartAccount, DEFAULT_NONCETRACK));
        assertEq(newNonce, origNonce);

        // simulation mode
        uint256 id = vm.snapshotState();
        vm.expectRevert(InvalidNonce.selector);
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        happyEntryPoint.submit(happyTx.encode());

        // Check that the once wasn't incremented
        newNonce = uint64(happyEntryPoint.nonceValues(smartAccount, DEFAULT_NONCETRACK));
        assertEq(newNonce, origNonce);
        vm.revertToState(id);
    }

    function testInvalidNonceFutureNonce() public {
        // Get the initial nonce
        uint64 origNonce = uint64(happyEntryPoint.nonceValues(smartAccount, DEFAULT_NONCETRACK));

        // Create a happyTx with a nonce value greater than the current nonce (positive nonceAhead)
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, smartAccount, new bytes(0));
        happyTx.nonceValue += 1;
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        vm.expectRevert(InvalidNonce.selector);
        happyEntryPoint.submit(happyTx.encode());

        // Check that the once wasn't incremented
        uint64 newNonce = uint64(happyEntryPoint.nonceValues(smartAccount, DEFAULT_NONCETRACK));
        assertEq(newNonce, origNonce);

        // simulation
        uint256 id = vm.snapshotState();
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());
        _assertExpectedSubmitOutput(output, false, false, true, CallStatus.SUCCEEDED, new bytes(0));
        assertTrue(output.futureNonceDuringSimulation, "output.futureNonceDuringSimulation");
        vm.revertToState(id);
    }

    function testNonceIncrementAfterSubmit() public {
        // Check initial nonce
        uint64 initialNonce = uint64(happyEntryPoint.nonceValues(smartAccount, DEFAULT_NONCETRACK));
        assertEq(initialNonce, 0);

        // Submit a transaction to increment the nonce
        _incrementAccountNonce();

        // Check that the nonce was incremented
        uint64 newNonce = uint64(happyEntryPoint.nonceValues(smartAccount, DEFAULT_NONCETRACK));
        assertEq(newNonce, 1);

        // simulation
        uint256 id = vm.snapshotState();
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        _incrementAccountNonce();
        newNonce = uint64(happyEntryPoint.nonceValues(smartAccount, DEFAULT_NONCETRACK));
        assertEq(newNonce, 2);
        vm.revertToState(id);
    }

    // ====================================================================================================
    // ACCOUNT VALIDATION TESTS

    function testValidatorRevertedAtEcdsaRecover() public {
        // Create a basic HappyTx
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, paymaster, mockToken, privKey);

        // Corrupt the validatorData with invalid signature format (not proper r,s,v format)
        // This will cause the recover function to revert during validation
        happyTx.validatorData = hex"deadbeef";

        vm.expectRevert(
            abi.encodeWithSelector(ValidationReverted.selector, abi.encodeWithSelector(InvalidSignature.selector))
        );
        happyEntryPoint.submit(happyTx.encode());
    }

    function testValidationFailedInvalidSignature() public {
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, smartAccount, mockToken, privKey);

        // Change any field (except nonce) to invalid the signature over the happyTx
        happyTx.gasLimit += 10;

        vm.expectRevert(
            abi.encodeWithSelector(ValidationFailed.selector, abi.encodeWithSelector(InvalidSignature.selector))
        );

        // Submit the transaction to trigger the revert
        happyEntryPoint.submit(happyTx.encode());
    }

    // ====================================================================================================
    // ACCOUNT VALIDATION TESTS (SIMULATION)

    function testSimulateWithUnknownDuringSimulation() public {
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, paymaster, mockToken, privKey);

        // Change any field to invalid the signature over the happyTx
        happyTx.paymaster = ZERO_ADDRESS; // This way, we don't have to stake a new account

        // The function should return output.validationStatus = UnknownDuringSimulation.selector
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());

        // The output should have UnknownDuringSimulation = true
        _assertExpectedSubmitOutput(output, true, false, false, CallStatus.SUCCEEDED, new bytes(0));
        assertTrue(output.validityUnknownDuringSimulation, "output.validityUnknownDuringSimulation");
    }

    // ====================================================================================================
    // PAYMASTER VALIDATION TESTS

    function testPaymasterValidationFailedSubmitterFeeTooHigh() public {
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, paymaster, mockToken, privKey);
        // maxFeePerByte = maxFeePerGas * 16
        // maxSubmitterFee = maxFeePerByte * totalSize (totalSize <= 10000, in this case)
        happyTx.submitterFee = int256(happyTx.maxFeePerGas * 16 * 2 * 10000);

        vm.expectRevert(
            abi.encodeWithSelector(
                PaymentValidationFailed.selector, abi.encodeWithSelector(SubmitterFeeTooHigh.selector)
            )
        );
        happyEntryPoint.submit(happyTx.encode());
    }

    function testPaymasterPaymentValidationRevertsOverFlow() public {
        HappyTx memory happyTx =
            getStubHappyTx(smartAccount, mockToken, paymaster, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        happyTx.maxFeePerGas = type(uint256).max; // This will cause an overflow and revert
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        // Panic error 0x11: Arithmetic operation results in underflow or overflow.
        bytes4 panicSelector = bytes4(keccak256("Panic(uint256)"));
        bytes memory overflowError = abi.encodeWithSelector(panicSelector, 0x11);

        vm.expectRevert(abi.encodeWithSelector(PaymentValidationReverted.selector, overflowError));
        happyEntryPoint.submit(happyTx.encode());
    }

    // ====================================================================================================
    // EXECUTION TESTS

    function testExecuteInnerCallRevertsEmptyCallData() public {
        HappyTx memory happyTx = createSignedHappyTx(smartAccount, dest, paymaster, privKey, new bytes(10));

        // This reverts with empty revertData: ← [Revert] EvmError: Revert
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.CALL_REVERTED, new bytes(0));
    }

    function testExecuteMockRevertIntentionalRevert() public {
        HappyTx memory happyTx =
            createSignedHappyTx(smartAccount, mockRevert, paymaster, privKey, getMockRevertCallData());

        // The result should be output.callStatus = CallReverted
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());

        _assertExpectedSubmitOutput(
            output,
            false,
            false,
            false,
            CallStatus.CALL_REVERTED,
            abi.encodeWithSelector(MockRevert.CustomErrorMockRevert.selector)
        );
    }

    function testExecuteMockRevertIntentionalEmptyRevert() public {
        HappyTx memory happyTx =
            createSignedHappyTx(smartAccount, mockRevert, paymaster, privKey, getMockRevertEmptyCallData());

        // This reverts with empty revertData: ← [Revert] EvmError: Revert
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.CALL_REVERTED, new bytes(0));
    }

    function testExecuteWithHighHappyTxValueGreaterThanSmartAccountBalance() public {
        // Set the initial balance of the smart account to 0
        vm.deal(smartAccount, 0);
        HappyTx memory happyTx = getStubHappyTx(smartAccount, dest, paymaster, new bytes(0));

        // Set happyTx.value to a value higher than the smart account's balance
        happyTx.value = 1 wei;
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        // The call should fail because the smartAccount address doesn't have enough funds
        vm.deal(smartAccount, 0);
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.CALL_REVERTED, new bytes(0));

        // Account balance should remain unchanged since the transaction would be unsuccessful
        uint256 newEthBalance = (smartAccount).balance;
        assertEq(newEthBalance, 0);
    }

    // ====================================================================================================
    // EXECUTION TESTS (SIMULATION)

    function testSimulationReturnsAccurateGasLimits() public {
        uint256 id = vm.snapshotState();
        HappyTx memory happyTx =
            getStubHappyTx(smartAccount, mockToken, smartAccount, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        happyTx.executeGasLimit = 0;
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());

        // The output.executeGas gives the gas usage for execute() call
        assertGt(output.executeGas, 0);

        vm.revertToState(id); // Revert the state to before the simulation

        // Submit the happyTx again, with the above execGasLimit
        HappyTx memory happyTx2 =
            getStubHappyTx(smartAccount, mockToken, smartAccount, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        happyTx2.validateGasLimit = output.validateGas * 120 / 100;
        happyTx2.executeGasLimit = output.executeGas * 120 / 100;
        happyTx2.payoutGasLimit = output.paymentValidateGas * 120 / 100;
        happyTx2.validatorData = signHappyTx(happyTx2, privKey);

        // This should succeed now if the execute-gas-limit estimation is accurate
        SubmitOutput memory output2 = happyEntryPoint.submit(happyTx2.encode());
        _assertExpectedSubmitOutput(output2, false, false, false, CallStatus.SUCCEEDED, new bytes(0));
    }

    // ====================================================================================================
    // PAYOUT TESTS (Self-Paying)

    function testSelfPayoutNegativeSubmitterFee() public {
        HappyTx memory happyTx =
            getStubHappyTx(smartAccount, mockToken, smartAccount, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        happyTx.maxFeePerGas = 10; // For simple case
        happyTx.submitterFee = -1_500_000; // Enough to make _charged < 0 inside HEP
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        // Submit the transaction
        vm.txGasPrice(happyTx.maxFeePerGas / 2);
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.SUCCEEDED, new bytes(0));
    }

    function testSelfPayoutRevertsOverFlow() public {
        HappyTx memory happyTx =
            getStubHappyTx(smartAccount, mockToken, smartAccount, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        happyTx.submitterFee = type(int256).max; // This will cause an overflow and revert
        vm.txGasPrice(happyTx.maxFeePerGas);
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        // Panic error 0x11: Arithmetic operation results in underflow or overflow.
        bytes4 panicSelector = bytes4(keccak256("Panic(uint256)"));

        vm.expectRevert(abi.encodeWithSelector(panicSelector, 0x11));
        happyEntryPoint.submit(happyTx.encode());
    }

    function testPayoutFailsDueToLowAccountBalance() public {
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, smartAccount, mockToken, privKey);

        // Give the account a low balance so it can't pay back the fee
        vm.deal(smartAccount, 0);

        vm.expectRevert(abi.encodeWithSelector(PayoutFailed.selector));
        vm.txGasPrice(happyTx.maxFeePerGas);
        happyEntryPoint.submit(happyTx.encode());
    }

    // ====================================================================================================
    // PAYOUT TESTS (Paymaster-Sponsored)

    function testPaymasterPayoutNegativeSubmitterFee() public {
        HappyTx memory happyTx =
            getStubHappyTx(smartAccount, mockToken, paymaster, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        happyTx.maxFeePerGas = 10; // For simple case
        happyTx.submitterFee = -1_500_000; // Enough to make _charged < 0 inside HEP
        happyTx.validatorData = signHappyTx(happyTx, privKey);

        // Submit the transaction
        vm.txGasPrice(happyTx.maxFeePerGas / 2);
        SubmitOutput memory output = happyEntryPoint.submit(happyTx.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.SUCCEEDED, new bytes(0));
    }

    function testPayoutFailsDueToLowPaymasterBalance() public {
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, paymaster, mockToken, privKey);
        console.log("Current Stake: ", happyEntryPoint.balanceOf(paymaster));

        // The 1st slot of struct Stake  is 128 bits balance, and 128 bits unlockedBalance
        // We can safely set both (overall slot) to 0, for this testcase

        bytes32 slot = keccak256(abi.encode(paymaster, 0));
        // console.log("Current value: ", uint256(vm.load(address(happyEntryPoint), slot)));

        // Store the new value with balance = 0, unlockedBalance = 0
        vm.store(address(happyEntryPoint), slot, 0);
        // console.log("New balance: ", happyEntryPoint.balanceOf(paymaster));

        vm.expectRevert(abi.encodeWithSelector(InsufficientStake.selector));
        vm.txGasPrice(happyTx.maxFeePerGas / 2);
        happyEntryPoint.submit(happyTx.encode());
    }

    // ====================================================================================================
    // HELPERS

    function _assertExpectedSubmitOutput(
        SubmitOutput memory output,
        bool validityUnknownDuringSimulation,
        bool paymentValidityUnknownDuringSimulation,
        bool futureNonceDuringSimulation,
        CallStatus callStatus,
        bytes memory revertData
    ) internal pure {
        assertEq(output.validityUnknownDuringSimulation, validityUnknownDuringSimulation);
        assertEq(output.paymentValidityUnknownDuringSimulation, paymentValidityUnknownDuringSimulation);
        assertEq(output.futureNonceDuringSimulation, futureNonceDuringSimulation);
        assertEq(uint8(output.callStatus), uint8(callStatus));
        assertEq(output.revertData, revertData);
    }

    function _incrementAccountNonce() internal {
        // Create a valid happyTx with the current nonce & submit it
        HappyTx memory happyTx = createSignedHappyTxForMintToken(smartAccount, dest, smartAccount, mockToken, privKey);
        happyEntryPoint.submit(happyTx.encode());
    }
}
