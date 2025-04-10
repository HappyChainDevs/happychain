// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ECDSA} from "solady/utils/ECDSA.sol";

import {BoopTestUtils} from "../Utils.sol";
import {MockERC20} from "../../../mocks/MockERC20.sol";
import {MockRevert} from "../../../mocks/MockRevert.sol";
import {DeployBoopContracts} from "../../../deploy/DeployBoop.s.sol";

import {Boop} from "boop/interfaces/Types.sol";
import {Encoding} from "boop/libs/Encoding.sol";
import {SubmitterFeeTooHigh} from "boop/interfaces/IPaymaster.sol";
import {InvalidSignature} from "boop/interfaces/EventsAndErrors.sol";

import {
    CallStatus,
    SubmitOutput,
    InsufficientStake,
    PaymentValidationRejected,
    PaymentValidationReverted,
    PayoutFailed,
    ValidationRejected,
    ValidationReverted,
    GasPriceTooHigh,
    InvalidNonce
} from "boop/core/EntryPoint.sol";

contract EntryPointTest is BoopTestUtils {
    using Encoding for Boop;
    using ECDSA for bytes32;

    // ====================================================================================================
    // CONSTANTS

    bytes32 private constant SALT = 0;
    bytes32 private constant SALT2 = bytes32(uint256(1));
    address private constant ZERO_ADDRESS = address(0);
    uint256 private constant INITIAL_DEPOSIT = 10 ether;

    // ====================================================================================================
    // STATE VARIABLES

    DeployBoopContracts private deployer;

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

        // Set up the Deployment Script, and deploy the boop contracts as foundry-account-0
        deployer = new DeployBoopContracts();
        vm.prank(owner);
        deployer.deployForTests();

        entryPoint = deployer.entryPoint();
        paymaster = address(deployer.happyPaymaster());
        smartAccount = deployer.happyAccountFactory().createAccount(SALT, owner);

        dest = deployer.happyAccountFactory().createAccount(SALT2, owner);

        // Fund the smart account and paymaster
        vm.deal(paymaster, INITIAL_DEPOSIT);
        vm.deal(smartAccount, INITIAL_DEPOSIT);

        // Stake the paymaster
        entryPoint.deposit{value: INITIAL_DEPOSIT}(paymaster);

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

        Boop memory boop = createSignedBoopForMintToken(smartAccount, dest, smartAccount, mockToken, privKey);
        SubmitOutput memory output = entryPoint.submit(boop.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.SUCCEEDED, new bytes(0));

        // The balance of the smart account should decrease after paying for the tx.
        uint256 finalBalance = getEthBalance(smartAccount);
        assertLt(finalBalance, initialBalance);

        uint256 finalTokenBalance = getTokenBalance(mockToken, dest);
        assertEq(finalTokenBalance, initialTokenBalance + TOKEN_MINT_AMOUNT);
    }

    function testPaymasterSponsoredTx() public {
        // Paymaster-sponsored: paymaster == HappyPaymaster
        uint256 initialStake = entryPoint.balanceOf(paymaster);
        uint256 initialTokenBalance = getTokenBalance(mockToken, dest);

        Boop memory boop = createSignedBoopForMintToken(smartAccount, dest, paymaster, mockToken, privKey);
        SubmitOutput memory output = entryPoint.submit(boop.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.SUCCEEDED, new bytes(0));

        // The balance of the paymaster should decrease after paying for the tx.
        uint256 finalStake = entryPoint.balanceOf(paymaster);
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

        Boop memory boop = createSignedBoopForMintToken(smartAccount, dest, ZERO_ADDRESS, mockToken, privKey);
        vm.prank(submitter, submitter);
        SubmitOutput memory output = entryPoint.submit(boop.encode());
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

        Boop memory boop =
            getStubBoop(smartAccount, mockToken, smartAccount, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        boop.gasLimit = 0;
        boop.executeGasLimit = 0;
        boop.validatorData = signBoop(boop, privKey);

        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = entryPoint.submit(boop.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.SUCCEEDED, new bytes(0));

        vm.revertToState(id); // EVM state is like before the .submit() call

        // The balance should be the same as before, as this was a simulated call, not actually submitted on-chain
        uint256 finalBalance = getEthBalance(smartAccount);
        assertEq(finalBalance, initialBalance);

        uint256 finalTokenBalance = getTokenBalance(mockToken, dest);
        assertEq(finalTokenBalance, initialTokenBalance);
    }

    function testSimulatePaymasterSponsoredTx() public {
        // Paymaster-sponsored simulation: paymaster is the HappyPaymaster
        uint256 id = vm.snapshotState();

        uint256 initialStake = entryPoint.balanceOf(paymaster);
        uint256 initialTokenBalance = getTokenBalance(mockToken, dest);

        Boop memory boop =
            getStubBoop(smartAccount, mockToken, paymaster, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        boop.gasLimit = 0;
        boop.executeGasLimit = 0;
        boop.maxFeePerGas = 0;
        boop.submitterFee = 0;
        boop.validatorData = signBoop(boop, privKey);
        boop.maxFeePerGas = 1200000000;

        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = entryPoint.submit(boop.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.SUCCEEDED, new bytes(0));

        vm.revertToState(id); // EVM state is like before the .submit() call

        // The balance should be the same as before, as this was a simulated call, not actually submitted on-chain
        uint256 finalStake = entryPoint.balanceOf(paymaster);
        assertEq(finalStake, initialStake);

        uint256 finalTokenBalance = getTokenBalance(mockToken, dest);
        assertEq(finalTokenBalance, initialTokenBalance);
    }

    function testSimulateSubmitterSponsoredTx() public {
        // Submitter-sponsored simulation: paymaster is zero address
        uint256 id = vm.snapshotState();

        uint256 initialBalance = getEthBalance(smartAccount);
        uint256 initialTokenBalance = getTokenBalance(mockToken, dest);

        Boop memory boop =
            getStubBoop(smartAccount, mockToken, ZERO_ADDRESS, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        boop.gasLimit = 0;
        boop.executeGasLimit = 0;
        boop.maxFeePerGas = 0;
        boop.submitterFee = 0;
        boop.validatorData = signBoop(boop, privKey);
        boop.maxFeePerGas = 1200000000;

        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = entryPoint.submit(boop.encode());
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
        Boop memory boop = createSignedBoopForMintToken(smartAccount, dest, paymaster, mockToken, privKey);
        vm.txGasPrice(boop.maxFeePerGas * 2);
        vm.expectRevert(GasPriceTooHigh.selector);
        entryPoint.submit(boop.encode());
    }

    function testInsufficientStake() public {
        Boop memory boop = createSignedBoopForMintToken(smartAccount, dest, paymaster, mockToken, privKey);
        boop.paymaster = dest; // An address which hasn't staked to the entrypoint
        vm.txGasPrice(boop.maxFeePerGas / 2);
        vm.expectRevert(InsufficientStake.selector);
        entryPoint.submit(boop.encode());
    }

    // ====================================================================================================
    // NONCE VALIDATION TESTS

    function testInvalidNonceStaleNonce() public {
        // First, increment the account's nonce by submitting a transaction
        _incrementAccountNonce();

        // Get the initial nonce
        uint64 origNonce = uint64(entryPoint.nonceValues(smartAccount, DEFAULT_NONCETRACK));

        // Create a boop with a nonce value less than the current nonce (negative nonceAhead)
        Boop memory boop = getStubBoop(smartAccount, dest, ZERO_ADDRESS, new bytes(0));
        boop.nonceValue -= 1;
        boop.validatorData = signBoop(boop, privKey);

        vm.expectRevert(InvalidNonce.selector);
        entryPoint.submit(boop.encode());

        // Check that the once wasn't incremented
        uint64 newNonce = uint64(entryPoint.nonceValues(smartAccount, DEFAULT_NONCETRACK));
        assertEq(newNonce, origNonce);

        // simulation mode
        uint256 id = vm.snapshotState();
        vm.expectRevert(InvalidNonce.selector);
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        entryPoint.submit(boop.encode());

        // Check that the once wasn't incremented
        newNonce = uint64(entryPoint.nonceValues(smartAccount, DEFAULT_NONCETRACK));
        assertEq(newNonce, origNonce);
        vm.revertToState(id);
    }

    function testInvalidNonceFutureNonce() public {
        // Get the initial nonce
        uint64 origNonce = uint64(entryPoint.nonceValues(smartAccount, DEFAULT_NONCETRACK));

        // Create a boop with a nonce value greater than the current nonce (positive nonceAhead)
        Boop memory boop = getStubBoop(smartAccount, dest, ZERO_ADDRESS, new bytes(0));
        boop.nonceValue += 1;
        boop.validatorData = signBoop(boop, privKey);

        vm.expectRevert(InvalidNonce.selector);
        entryPoint.submit(boop.encode());

        // Check that the once wasn't incremented
        uint64 newNonce = uint64(entryPoint.nonceValues(smartAccount, DEFAULT_NONCETRACK));
        assertEq(newNonce, origNonce);

        // simulation
        uint256 id = vm.snapshotState();
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = entryPoint.submit(boop.encode());
        _assertExpectedSubmitOutput(output, false, false, true, CallStatus.SUCCEEDED, new bytes(0));
        assertTrue(output.futureNonceDuringSimulation);
        vm.revertToState(id);
    }

    function testNonceIncrementAfterSubmit() public {
        // Check initial nonce
        uint64 initialNonce = uint64(entryPoint.nonceValues(smartAccount, DEFAULT_NONCETRACK));
        assertEq(initialNonce, 0);

        // Submit a transaction to increment the nonce
        _incrementAccountNonce();

        // Check that the nonce was incremented
        uint64 newNonce = uint64(entryPoint.nonceValues(smartAccount, DEFAULT_NONCETRACK));
        assertEq(newNonce, 1);

        // simulation
        uint256 id = vm.snapshotState();
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        _incrementAccountNonce();
        newNonce = uint64(entryPoint.nonceValues(smartAccount, DEFAULT_NONCETRACK));
        assertEq(newNonce, 2);
        vm.revertToState(id);
    }

    // ====================================================================================================
    // ACCOUNT VALIDATION TESTS

    function testValidatorRevertedAtEcdsaRecover() public {
        // Create a basic Boop
        Boop memory boop = createSignedBoopForMintToken(smartAccount, dest, paymaster, mockToken, privKey);

        // Corrupt the validatorData with invalid signature format (not proper r,s,v format)
        // This will cause the recover function to revert during validation
        boop.validatorData = hex"deadbeef";

        vm.expectRevert(
            abi.encodeWithSelector(ValidationReverted.selector, abi.encodeWithSelector(InvalidSignature.selector))
        );
        entryPoint.submit(boop.encode());
    }

    function testValidationRejectedInvalidSignature() public {
        Boop memory boop = createSignedBoopForMintToken(smartAccount, dest, smartAccount, mockToken, privKey);

        // Change any field (except nonce) to invalid the signature over the boop
        boop.gasLimit += 10;

        vm.expectRevert(
            abi.encodeWithSelector(ValidationRejected.selector, abi.encodeWithSelector(InvalidSignature.selector))
        );

        // Submit the transaction to trigger the revert
        entryPoint.submit(boop.encode());
    }

    // ====================================================================================================
    // ACCOUNT VALIDATION TESTS (SIMULATION)

    function testSimulateWithUnknownDuringSimulation() public {
        Boop memory boop = createSignedBoopForMintToken(smartAccount, dest, paymaster, mockToken, privKey);

        // Change any field to invalid the signature over the boop
        boop.paymaster = ZERO_ADDRESS; // This way, we don't have to stake a new account

        // The function should return output.validationStatus = UnknownDuringSimulation.selector
        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = entryPoint.submit(boop.encode());

        // The output should have UnknownDuringSimulation = true
        _assertExpectedSubmitOutput(output, true, false, false, CallStatus.SUCCEEDED, new bytes(0));
        assertTrue(output.validityUnknownDuringSimulation, "output.validityUnknownDuringSimulation");
    }

    // ====================================================================================================
    // ACCOUNT VALIDATION TESTS (Out of Gas)

    function testAccountValidationOutOfGas() public {
        uint256 id = vm.snapshotState();
        Boop memory boop =
            getStubBoop(smartAccount, mockToken, ZERO_ADDRESS, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        boop.executeGasLimit = 0;
        boop.validateGasLimit = 0;
        boop.validatorData = signBoop(boop, privKey);

        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = entryPoint.submit(boop.encode());

        // The output.validateGas gives the gas usage for validate() call
        assertGt(output.validateGas, 0);

        vm.revertToState(id); // Revert the state to before the simulation

        // Submit the boop again, with half the validate gas limit
        // This should cause the validation to run out of gas
        Boop memory boop2 =
            getStubBoop(smartAccount, mockToken, ZERO_ADDRESS, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        boop2.validateGasLimit = output.validateGas / 10;
        boop2.executeGasLimit = output.executeGas * 120 / 100;
        boop2.validatePaymentGasLimit = output.paymentValidateGas * 120 / 100;
        boop2.validatorData = signBoop(boop2, privKey);

        // This should revert with ValidationReverted since validate() will run out of gas
        vm.expectRevert(abi.encodeWithSelector(ValidationReverted.selector, new bytes(0)));
        entryPoint.submit(boop2.encode());
    }

    // ====================================================================================================
    // PAYMASTER VALIDATION TESTS

    function testPaymasterValidationRejectedSubmitterFeeTooHigh() public {
        Boop memory boop = createSignedBoopForMintToken(smartAccount, dest, paymaster, mockToken, privKey);
        // maxFeePerByte = maxFeePerGas * 16
        // maxSubmitterFee = maxFeePerByte * totalSize (totalSize <= 10000, in this case)
        boop.submitterFee = int256(boop.maxFeePerGas * 16 * 2 * 10000);

        vm.expectRevert(
            abi.encodeWithSelector(
                PaymentValidationRejected.selector, abi.encodeWithSelector(SubmitterFeeTooHigh.selector)
            )
        );
        entryPoint.submit(boop.encode());
    }

    function testPaymasterPaymentValidationRevertsOverFlow() public {
        Boop memory boop =
            getStubBoop(smartAccount, mockToken, paymaster, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        boop.maxFeePerGas = type(uint256).max; // This will cause an overflow and revert
        boop.validatorData = signBoop(boop, privKey);

        // Panic error 0x11: Arithmetic operation results in underflow or overflow.
        bytes4 panicSelector = bytes4(keccak256("Panic(uint256)"));
        bytes memory overflowError = abi.encodeWithSelector(panicSelector, 0x11);

        vm.expectRevert(abi.encodeWithSelector(PaymentValidationReverted.selector, overflowError));
        entryPoint.submit(boop.encode());
    }

    // ====================================================================================================
    // PAYMENT VALIDATION TESTS (Out of Gas)

    function testPaymasterPaymentValidationOutOfGas() public {
        uint256 id = vm.snapshotState();
        Boop memory boop =
            getStubBoop(smartAccount, mockToken, paymaster, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        boop.executeGasLimit = 0;
        boop.validatePaymentGasLimit = 0;
        boop.validatorData = signBoop(boop, privKey);

        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = entryPoint.submit(boop.encode());

        // The output.paymentValidateGas gives the gas usage for validatePayment() call
        assertGt(output.paymentValidateGas, 0);

        vm.revertToState(id); // Revert the state to before the simulation

        // Submit the boop again, with a fraction of the paymaster validation gas limit
        // This should cause the paymaster validation to run out of gas
        Boop memory boop2 =
            getStubBoop(smartAccount, mockToken, paymaster, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        boop2.validateGasLimit = output.validateGas * 120 / 100; // Set this higher to ensure it's not the issue
        boop2.validatePaymentGasLimit = output.paymentValidateGas / 10; // Set to 1/10 of required gas
        boop2.executeGasLimit = output.executeGas * 120 / 100; // Set this higher to ensure it's not the issue
        boop2.validatorData = signBoop(boop2, privKey);

        // This should revert with PaymentValidationReverted since validatePayment() will run out of gas
        vm.expectRevert(abi.encodeWithSelector(PaymentValidationReverted.selector, new bytes(0)));
        entryPoint.submit(boop2.encode());
    }

    // ====================================================================================================
    // EXECUTION TESTS

    function testExecuteInnerCallRevertsEmptyCallData() public {
        Boop memory boop = createSignedBoop(smartAccount, dest, paymaster, privKey, new bytes(10));

        // This reverts with empty revertData: ← [Revert] EvmError: Revert
        SubmitOutput memory output = entryPoint.submit(boop.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.CALL_REVERTED, new bytes(0));
    }

    function testExecuteMockRevertIntentionalRevert() public {
        Boop memory boop = createSignedBoop(smartAccount, mockRevert, paymaster, privKey, getMockRevertCallData());

        // The result should be output.callStatus = CallReverted
        SubmitOutput memory output = entryPoint.submit(boop.encode());

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
        Boop memory boop = createSignedBoop(smartAccount, mockRevert, paymaster, privKey, getMockRevertEmptyCallData());

        // This reverts with empty revertData: ← [Revert] EvmError: Revert
        SubmitOutput memory output = entryPoint.submit(boop.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.CALL_REVERTED, new bytes(0));
    }

    function testExecuteWithHighBoopValueGreaterThanSmartAccountBalance() public {
        // Set the initial balance of the smart account to 0
        vm.deal(smartAccount, 0);
        Boop memory boop = getStubBoop(smartAccount, dest, paymaster, new bytes(0));

        // Set boop.value to a value higher than the smart account's balance
        boop.value = 1 wei;
        boop.validatorData = signBoop(boop, privKey);

        // The call should fail because the smartAccount address doesn't have enough funds
        vm.deal(smartAccount, 0);
        SubmitOutput memory output = entryPoint.submit(boop.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.CALL_REVERTED, new bytes(0));

        // Account balance should remain unchanged since the transaction would be unsuccessful
        uint256 newEthBalance = (smartAccount).balance;
        assertEq(newEthBalance, 0);
    }

    // ====================================================================================================
    // EXECUTION TESTS (SIMULATION)

    function testSimulationReturnsAccurateGasLimits() public {
        uint256 id = vm.snapshotState();
        Boop memory boop =
            getStubBoop(smartAccount, mockToken, smartAccount, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        boop.executeGasLimit = 0;
        boop.validatorData = signBoop(boop, privKey);

        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = entryPoint.submit(boop.encode());

        // The output.executeGas gives the gas usage for execute() call
        assertGt(output.executeGas, 0);

        vm.revertToState(id); // Revert the state to before the simulation

        // Submit the boop again, with the above execGasLimit
        Boop memory boop2 =
            getStubBoop(smartAccount, mockToken, smartAccount, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        boop2.validateGasLimit = output.validateGas * 120 / 100;
        boop2.executeGasLimit = output.executeGas * 120 / 100;
        boop2.validatePaymentGasLimit = output.paymentValidateGas * 120 / 100;
        boop2.validatorData = signBoop(boop2, privKey);

        // This should succeed now if the execute-gas-limit estimation is accurate
        SubmitOutput memory output2 = entryPoint.submit(boop2.encode());
        _assertExpectedSubmitOutput(output2, false, false, false, CallStatus.SUCCEEDED, new bytes(0));
    }

    // ====================================================================================================
    // EXECUTION TESTS (Out of Gas)

    function testExecutionOutOfGas() public {
        uint256 id = vm.snapshotState();
        Boop memory boop =
            getStubBoop(smartAccount, mockToken, ZERO_ADDRESS, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        boop.executeGasLimit = 0;
        boop.validatorData = signBoop(boop, privKey);

        vm.prank(ZERO_ADDRESS, ZERO_ADDRESS);
        SubmitOutput memory output = entryPoint.submit(boop.encode());

        // The output.executeGas gives the gas usage for execute() call
        assertGt(output.executeGas, 0);

        vm.revertToState(id); // Revert the state to before the simulation

        // Submit the boop again, with the execute gas limit set too low
        Boop memory boop2 =
            getStubBoop(smartAccount, mockToken, ZERO_ADDRESS, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        boop2.validateGasLimit = output.validateGas * 120 / 100; // Set this higher to ensure it's not the issue
        boop2.executeGasLimit = output.executeGas / 10; // Set to 1/10 of required gas
        boop2.validatePaymentGasLimit = output.paymentValidateGas * 120 / 100; // Set this higher to ensure it's not the issue
        boop2.validatorData = signBoop(boop2, privKey);

        // Execute the transaction - note that execute() running out of gas doesn't cause a revert
        // in the entry point, but instead sets the callStatus to EXECUTE_REVERTED
        SubmitOutput memory output2 = entryPoint.submit(boop2.encode());

        // The execution should have reverted due to out of gas
        _assertExpectedSubmitOutput(output2, false, false, false, CallStatus.EXECUTE_REVERTED, new bytes(0));
    }

    // ====================================================================================================
    // PAYOUT TESTS (Self-Paying)

    function testSelfPayoutNegativeSubmitterFee() public {
        Boop memory boop =
            getStubBoop(smartAccount, mockToken, smartAccount, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        boop.maxFeePerGas = 10; // For simple case
        boop.submitterFee = -1_500_000; // Enough to make _charged < 0 inside HEP
        boop.validatorData = signBoop(boop, privKey);

        // Submit the transaction
        vm.txGasPrice(boop.maxFeePerGas / 2);
        SubmitOutput memory output = entryPoint.submit(boop.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.SUCCEEDED, new bytes(0));
    }

    function testSelfPayoutRevertsOverFlow() public {
        Boop memory boop =
            getStubBoop(smartAccount, mockToken, smartAccount, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        boop.submitterFee = type(int256).max; // This will cause an overflow and revert
        vm.txGasPrice(boop.maxFeePerGas);
        boop.validatorData = signBoop(boop, privKey);

        // Panic error 0x11: Arithmetic operation results in underflow or overflow.
        bytes4 panicSelector = bytes4(keccak256("Panic(uint256)"));

        vm.expectRevert(abi.encodeWithSelector(panicSelector, 0x11));
        entryPoint.submit(boop.encode());
    }

    function testPayoutFailsDueToLowAccountBalance() public {
        Boop memory boop = createSignedBoopForMintToken(smartAccount, dest, smartAccount, mockToken, privKey);

        // Give the account a low balance so it can't pay back the fee
        vm.deal(smartAccount, 0);

        vm.expectRevert(abi.encodeWithSelector(PayoutFailed.selector));
        vm.txGasPrice(boop.maxFeePerGas);
        entryPoint.submit(boop.encode());
    }

    // ====================================================================================================
    // PAYOUT TESTS (Paymaster-Sponsored)

    function testPaymasterPayoutNegativeSubmitterFee() public {
        Boop memory boop =
            getStubBoop(smartAccount, mockToken, paymaster, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));
        boop.maxFeePerGas = 10; // For simple case
        boop.submitterFee = -1_500_000; // Enough to make _charged < 0 inside HEP
        boop.validatorData = signBoop(boop, privKey);

        // Submit the transaction
        vm.txGasPrice(boop.maxFeePerGas / 2);
        SubmitOutput memory output = entryPoint.submit(boop.encode());
        _assertExpectedSubmitOutput(output, false, false, false, CallStatus.SUCCEEDED, new bytes(0));
    }

    function testPayoutFailsDueToLowPaymasterBalance() public {
        Boop memory boop = createSignedBoopForMintToken(smartAccount, dest, paymaster, mockToken, privKey);
        // console.log("Current Stake: ", entryPoint.balanceOf(paymaster));

        // The 1st slot of struct Stake  is 128 bits balance, and 128 bits unlockedBalance
        // We can safely set both (overall slot) to 0, for this testcase

        bytes32 slot = keccak256(abi.encode(paymaster, 0));
        // console.log("Current value: ", uint256(vm.load(address(entryPoint), slot)));

        // Store the new value with balance = 0, unlockedBalance = 0
        vm.store(address(entryPoint), slot, 0);
        // console.log("New balance: ", entryPoint.balanceOf(paymaster));

        vm.expectRevert(abi.encodeWithSelector(InsufficientStake.selector));
        vm.txGasPrice(boop.maxFeePerGas / 2);
        entryPoint.submit(boop.encode());
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
        // Create a valid boop with the current nonce & submit it
        Boop memory boop = createSignedBoopForMintToken(smartAccount, dest, ZERO_ADDRESS, mockToken, privKey);
        entryPoint.submit(boop.encode());
    }
}
