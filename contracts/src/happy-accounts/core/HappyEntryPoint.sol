// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ExcessivelySafeCall} from "ExcessivelySafeCall/ExcessivelySafeCall.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

import {HappyTx} from "boop/core/HappyTx.sol";
import {Staking, Stake} from "boop/core/Staking.sol";
import {IHappyAccount, ExecutionOutput} from "boop/interfaces/IHappyAccount.sol";
import {IHappyPaymaster} from "boop/interfaces/IHappyPaymaster.sol";
import {HappyTxLib} from "boop/libs/HappyTxLib.sol";
import {UnknownDuringSimulation} from "boop/utils/Common.sol";

import {console} from "forge-std/console.sol";

enum CallStatus {
    SUCCEEDED, // The call succeeded.
    CALL_REVERTED, // The call reverted.
    EXECUTE_FAILED, // The {IHappyAccount.execute} function failed (incorrect input).
    EXECUTE_REVERTED // The {IHappyAccount.execute} function reverted (in violation of the spec).

}

struct SubmitOutput {
    /**
     * An overestimation of the minimum gas limit necessary to successfully call {EntryPoint.submit}
     * at the top-level of a transaction.
     */
    uint32 gas;
    /**
     * An overestimation of the minimum gas limit necessary to successfully call
     * {IHappyAccount.validate} from {EntryPoint.submit}.
     */
    uint32 validateGas;
    /**
     * An overestimation of the minimum gas limit necessary to successfully call
     * {IHappyAccount.execute} from {EntryPoint.submit}.
     */
    uint32 executeGas;
    /**
     * An overestimation of the minimum gas limit necessary to successfully call
     * {IHappyPaymaster.execute} from {EntryPoint.submit}.
     */
    uint32 payoutGas;
    /**
     * If true, indicates that the account couldn't ascertain whether the validation was successful
     * in validation mode (e.g. it couldn't validate a signature because the simulation was used
     * to populate some of the fields that the signature signs over).
     */
    bool validityUnknownDuringSimulation;
    /**
     * If true, indicates that the account couldn't ascertain whether the validation was successful
     * in validation mode (e.g. it couldn't validate a signature because the simulation was used
     * to populate some of the fields that the signature signs over).
     */
    bool paymentValidityUnknownDuringSimulation;
    /**
     * If true, indicates that while the simulation succeeded, the nonce is ahead of the current
     * nonce.
     */
    bool futureNonceDuringSimulation;
    /**
     * Status of the call specified by the happy tx.
     */
    CallStatus callStatus;
    /**
     * The revertData with which either the call or the {IHappyAccount.execute} function reverted
     * (when the associated `callStatus` is set).
     */
    bytes revertData;
}

/**
 * The entrypoint reverts with this error when the gas price exceed {HappyTx.maxFeePerGas}.
 */
error GasPriceTooHigh();

/**
 * The entrypoint reverts with this error if the paymaster cannot cover the gas limit cost from his
 * stake.
 */
error InsufficientStake();

/**
 * The entrypoint reverts with this error if the nonce fails to validate.
 * This indicates an invalid nonce that cannot be used now or (in simulation mode) in the future.
 */
error InvalidNonce();

/**
 * When the account validation of the happyTx reverts (in violation of the spec).
 *
 * The parameter contains the revert data (truncated to 256 bytes).
 */
error ValidationReverted(bytes revertData);

/**
 * When the account validation of the happyTx fails.
 *
 * The parameter identifies the revert reason (truncated to 192 bytes), which should be an encoded
 * custom error returned by {IHappyAccount.validate}.
 */
error ValidationFailed(bytes reason);

/**
 * When the paymaster validation of the happyTx reverts (in violation of the spec).
 *
 * The parameter contains the revert data (truncated to 256 bytes)
 */
error PaymentValidationReverted(bytes revertData);

/**
 * When the paymaster validation of the happyTx fails.
 *
 * The parameter identifies the revert reason (truncated to 192 bytes), which should be an encoded
 * custom error returned by {IHappyPaymaster.validatePayment}.
 */
error PaymentValidationFailed(bytes reason);

/**
 * When self-paying and the payment from the account fails, either because {IHappyAccount.payout}
 * reverts, consumes too much gas, or does not transfer the full cost to the submitter.
 */
error PayoutFailed();

/**
 * When the {IHappyAccount.execute} call succeeds but reports that the
 * attempted call reverted.
 *
 * The parameter contains the revert data (truncated to {MAX_EXECUTE_RETURN_DATA_SIZE}
 * bytes, so that it can be parsed offchain.
 */
event CallReverted(bytes revertData);

/**
 * When the {IHappyAccount.execute} call reverts (in violation of the spec).
 *
 * The parameter contains the revert data (truncated to {MAX_EXECUTE_RETURN_DATA_SIZE}
 * bytes, so that it can be parsed offchain.
 */
event ExecutionReverted(bytes revertData);

/// @notice cf. {HappyEntryPoint.submit}
contract HappyEntryPoint is Staking, ReentrancyGuardTransient {
    // Avoid gas exhaustion via return data.
    using ExcessivelySafeCall for address;

    // ====================================================================================================
    // STATE

    mapping(address account => mapping(uint192 nonceTrack => uint64 nonceValue)) public nonceValues;

    // ====================================================================================================
    // SUBMIT

    /**
     * Execute a Happy Transaction, and tries to ensure that the submitter
     * (tx.origin) receives payment for submitting the transaction.
     *
     * This function immediately reverts or emits the errors and events defined
     * in this file whenever the associated condition is hit.
     *
     * This function will also, in this order:
     *
     * 1. Call the account to validate the happyTx.
     *    See {IHappyAccount.validate} for compliant behaviour.
     *
     * 2. Call the account to execute the transaction.
     *    See {IHappyAccount.execute} for compliant behaviour.
     *
     * 3. Produce a slight overestimation of the gas cost of submitting this
     *    transaction, and charge it either to the paymaster (which can be the
     *    account itself) by calling its {IPaymaster.payout} function.
     *    The paymaster must pay this amount + the cost of the `payout` call.
     *
     * Gas estimation is then possible by doing an `eth_call` on this function
     * with `address(0)` as the sender (`tx.origin`) -— as this scenario is
     * impossible onchain. We call this "simulation mode".
     *
     * In simulation mode, this function must ignore failed (but not
     * reverted) account and paymaster validation if their result is
     * the selector of {UnknownDuringSimulation} or
     * {FutureNonceDuringSimulation}.
     *
     * Note that the function actually ignores the return value of `payout` (except to report it back)
     * as long as the payment is effectively made.
     *
     * The function returns a filled-in {SubmitOutput} structure.
     * This is needed during simulation, as the logs are not available with
     * `eth_call`.
     *
     * NOTE: When `eth_simulateV1` (which does allow simple RPC log access)
     * becomes broadly available, the `SubmitOutput` structure can be removed
     * entirely, and the function doesn't need to return anything.
     * Also note that `debug_traceCall` is not an acceptable substitute, given
     * that it requires a custom tracer and that those are incompatible between
     * node implementations.
     */
    function submit(bytes calldata encodedHappyTx) external nonReentrant returns (SubmitOutput memory output) {
        uint256 gasStart = gasleft();
        HappyTx memory happyTx = HappyTxLib.decode(encodedHappyTx);
        bool isSimulation = tx.origin == address(0);

        // ==========================================================================================
        // 1. Validate gas price & paymaster balance

        if (tx.gasprice > happyTx.maxFeePerGas) {
            revert GasPriceTooHigh();
        }

        if (happyTx.paymaster != address(0) && happyTx.paymaster != happyTx.account) {
            if (stakes[happyTx.paymaster].balance < happyTx.gasLimit * tx.gasprice) {
                revert InsufficientStake();
            }
        }

        // ==========================================================================================
        // 2. Validate with account

        (Validity result, uint32 gasUsed, bytes memory revertData) =
            validate(IHappyAccount.validate.selector, happyTx, happyTx.validateGasLimit);

        if (result == Validity.CALL_REVERTED) revert ValidationReverted(revertData);
        if (result == Validity.INVALID_RETURN_DATA) revert ValidationReverted(revertData);
        if (result == Validity.VALIDATION_FAILED) revert ValidationFailed(revertData);
        if (result == Validity.UNKNOWN_DURING_SIMULATION) {
            output.validityUnknownDuringSimulation = true;
        }
        output.validateGas = gasUsed;

        // ==========================================================================================
        // 3. Validate with paymaster

        (result, gasUsed, revertData) =
            validate(IHappyPaymaster.validatePayment.selector, happyTx, happyTx.payoutGasLimit);

        if (result == Validity.CALL_REVERTED) revert PaymentValidationReverted(revertData);
        if (result == Validity.INVALID_RETURN_DATA) revert PaymentValidationReverted(revertData);
        if (result == Validity.VALIDATION_FAILED) revert PaymentValidationFailed(revertData);
        if (result == Validity.UNKNOWN_DURING_SIMULATION) {
            output.paymentValidityUnknownDuringSimulation = true;
        }
        output.payoutGas = gasUsed;

        // ==========================================================================================
        // 2. Validate & update nonce

        int256 expectedNonce = int256(uint256(nonceValues[happyTx.account][happyTx.nonceTrack]));
        int256 nonceAhead = int256(uint256(happyTx.nonceValue)) - expectedNonce;
        if (nonceAhead < 0 || (!isSimulation && nonceAhead != 0)) revert InvalidNonce();
        if (nonceAhead > 0) output.futureNonceDuringSimulation = true;
        nonceValues[happyTx.account][happyTx.nonceTrack]++;

        // ==========================================================================================
        // 4. Execute the call

        bytes memory callData = abi.encodeCall(IHappyAccount.execute, happyTx);
        uint256 gasBefore = gasleft();
        (bool success, bytes memory returnData) = happyTx.account.excessivelySafeCall(
            isSimulation && happyTx.executeGasLimit == 0 ? gasleft() : happyTx.executeGasLimit,
            0, // gas token transfer value
            384, // max return size: struct encoding + 256 bytes revertData
            callData
        );
        output.executeGas = uint32(gasBefore - gasleft());

        // Don't revert if execution fails, as we still want to get the payment for a reverted call.
        if (!success) {
            emit ExecutionReverted(returnData);
            output.callStatus = CallStatus.EXECUTE_REVERTED;
            output.revertData = returnData;
        } else {
            (output.callStatus, output.revertData) = parseExecutionOutput(returnData);
            if (output.callStatus == CallStatus.CALL_REVERTED) {
                emit CallReverted(output.revertData);
            }
        }

        // ==========================================================================================
        // 5. Collect payment

        uint128 cost;

        if ( /* sponsoring submitter */ happyTx.paymaster == address(0)) {
            output.gas = HappyTxLib.txGasFromCallGas(gasStart - gasleft(), 4 + encodedHappyTx.length);
            // done!
        } else if ( /* self-paying */ happyTx.paymaster == happyTx.account) {
            uint256 balance = tx.origin.balance;
            gasBefore = gasleft();
            // The constant 12000 overestimates the cost of the rest of execution, including
            // 9100 gas of the value transfer.
            (output.gas, cost) = computeCost(happyTx, gasStart - gasBefore + 12000, encodedHappyTx.length);
            (success,) = happyTx.account.excessivelySafeCall(
                gasleft() - 3000,
                0, // value
                0, // maxCopy
                abi.encodeWithSelector(IHappyAccount.payout.selector, cost)
            );
            if (!success || gasBefore - gasleft() > 12000 || tx.origin.balance < balance + cost) {
                revert PayoutFailed();
            }
        } /* paymaster */ else {
            // The constant 16000 overestimates the the cost of the rest of execution, including
            // - 2900 gas for writing to stake.balance (warm)
            // - 100 gas for reading stake.balance (warm)
            // - 2100 gas for reading stake.unlockedBalance (cold)
            // - 9100 gas for the value transfer
            (output.gas, cost) = computeCost(happyTx, gasStart - gasleft() + 16000, encodedHappyTx.length);
            // Pay submitter — no need for revert checks (submitter wants this to succeed).
            // This should succeed by construction, because of the early staking balance check.
            _transferTo(happyTx.paymaster, payable(tx.origin), cost);
        }
    }

    // ====================================================================================================
    // HELPERS

    enum Validity {
        SUCCESS,
        CALL_REVERTED,
        INVALID_RETURN_DATA,
        VALIDATION_FAILED,
        UNKNOWN_DURING_SIMULATION
    }

    /**
     * Given a happyTx, the gas consumed by the entrypoint body (metered until the computeCost call
     * + estimation of the rest of execution) and its encoded length, returns an estimation of the
     * gas consumed by the submitter transaction (including intrinsic gas and data gas) and the
     * total cost to charge to the fee payer.
     */
    function computeCost(HappyTx memory happyTx, uint256 entryPointGas, uint256 encodedLength)
        internal
        view
        returns (uint32 consumedGas, uint128 cost)
    {
        // The constant 4 is the byte size for the selector for `submit`.
        consumedGas = HappyTxLib.txGasFromCallGas(entryPointGas, 4 + encodedLength);

        // Upper-bound the payment to the agree-upon gas limit.
        uint256 boundedGas = consumedGas > happyTx.gasLimit ? happyTx.gasLimit : consumedGas;
        int256 gasCost = int256(boundedGas * tx.gasprice);

        // The submitter fee can be negative (rebates) but we can't charge less than 0.
        cost = gasCost + happyTx.submitterFee > 0 ? uint128(uint256(gasCost + happyTx.submitterFee)) : 0;

        return (consumedGas, cost);
    }

    /**
     * This function abstracts common boilerplate for calling {IHappyAccount.validate} and
     * {IHappyPaymaster.validatePayment}.
     *
     * It attempts to call the given function and returns the appropriate {Validity} status, the
     * call's gas consumption, and data to be passed to a revert if appropriate.
     */
    function validate(bytes4 fn, HappyTx memory happyTx, uint256 gasLimit)
        internal
        returns (Validity result, uint32 gasUsed, bytes memory revertData)
    {
        bool isSimulation = tx.origin == address(0);
        if (isSimulation && gasLimit == 0) gasLimit = gasleft();
        bytes memory callData = abi.encodeWithSelector(fn, happyTx);

        uint256 gasBefore = gasleft();
        // max return size: 256, leaving 192 bytes usable for an encoded error
        (bool success, bytes memory returnData) =
            happyTx.account.excessivelySafeCall(gasLimit, /* value: */ 0, 256, callData);
        gasUsed = uint32(gasBefore - gasleft());

        if (!success) return (Validity.CALL_REVERTED, gasUsed, returnData);

        bytes4 selector;
        bytes memory status;
        assembly {
            // Decoding the return data of a `returns (bytes memory)` function.
            // 0: outer bytes length, 32: inner bytes offset, 64: inner bytes length: 96: content
            // If returnData is too short, this might read garbage, but will not revert.
            // We avoid `abi.decode(returnData, (bytes))` because it can revert.
            status := add(returnData, 64)
            selector := mload(add(returnData, 96))
        }

        if (returnData.length < 96 || status.length < 4 || status.length > 192) {
            // only 256 bytes were copied, and there's 64 for tuple offset and inner bytes length
            return (Validity.INVALID_RETURN_DATA, gasUsed, returnData);
        } else if (isSimulation && selector == UnknownDuringSimulation.selector) {
            return (Validity.UNKNOWN_DURING_SIMULATION, gasUsed, "");
        } else if (selector != 0) {
            return (Validity.VALIDATION_FAILED, gasUsed, status);
        } else {
            return (Validity.SUCCESS, gasUsed, "");
        }
    }

    /**
     * Parses the {ExecutionOutput} returned by {IHappyAccount.execute} without reverting, which
     * `abi.decode` can't do. A malicious input can't hurt us: at worse we'll read garbage (but the
     * function could have returned garbage if it wanted to).
     */
    function parseExecutionOutput(bytes memory returnData)
        internal
        pure
        returns (CallStatus status, bytes memory revertData)
    {
        uint256 revertDataSize;
        assembly {
            // skip outer bytes length and struct offset, read status
            status := mload(add(returnData, 64))
            // skip output status and struct bytes offset, read size
            revertDataSize := mload(add(returnData, 128))
        }
        if (revertDataSize > 256) revertDataSize = 256; // copy only what we have
        revertData = new bytes(revertDataSize);
        assembly {
            mcopy(revertData, add(returnData, 160), revertDataSize)
        }
        if (status != CallStatus.SUCCEEDED && status != CallStatus.CALL_REVERTED) {
            // The returned status is incorrect, treat this like a revert.
            status = CallStatus.EXECUTE_REVERTED;
        }
    }
}
