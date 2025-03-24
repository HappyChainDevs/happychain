// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ExcessivelySafeCall} from "ExcessivelySafeCall/ExcessivelySafeCall.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

import {HappyTx} from "boop/core/HappyTx.sol";
import {IHappyAccount, ExecutionOutput} from "boop/interfaces/IHappyAccount.sol";
import {IHappyPaymaster} from "boop/interfaces/IHappyPaymaster.sol";
import {HappyTxLib} from "boop/libs/HappyTxLib.sol";
import {FutureNonceDuringSimulation, UnknownDuringSimulation} from "boop/utils/Common.sol";

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
     * Return value of {IHappyAccount.validate}.
     *
     * This is an encoded error, or encoded "error" with bytes4(0) as a selector in case of success.
     * Standard errors include {UnknownDuringSimulation}, indicating that more data is needed (e.g.
     * a signature over the gas fields) but gas could still be estimated, and
     * {FutureNonceDuringSimulation}, indicating that the transaction is valid but can't be
     * submitted until the nonce matches. Custom errors can be used to indicate further reasons for
     * rejection.
     */
    bytes validationStatus;
    /**
     * Status of the call specified by the happy tx.
     */
    CallStatus callStatus;
    /**
     * The revertData with which either the call or the {IHappyAccount.execute} function reverted
     * (when the associated `callStatus` is set).
     */
    bytes revertData;
    /**
     * The return status of {IHappyPaymaster.payout}. If successful, this will be a 4-bytes 0 value,
     * otherwise the result of an `abi.encodeWithSelector` call, using an error selector to
     * communicate the reason for failure. This value is returned (not reverted) from `payout` to
     * communicate the difference between an orderly rejection and an unexpected revert.
     */
    bytes payoutStatus;
}

/**
 * The entrypoint reverts with this error when the gas price exceed {HappyTx.maxFeePerGas}.
 */
error GasPriceTooHigh();

/**
 * The entrypoint reverts with this error if the nonce fails to validate.
 * This indicates an invalid nonce that cannot be used now or (in simulation mode) in the future.
 */
error InvalidNonce();

/**
 * When the account validation of the happyTx reverts (in violation of the spec).
 *
 * The parameter contains the revert data (truncated to {MAX_VALIDATE_RETURN_DATA_SIZE}
 * bytes), so that it can be parsed offchain.
 */
error ValidationReverted(bytes revertData);

/**
 * When the account validation of the happyTx fails.
 *
 * The parameter identifies the revert reason, which should be an encoded custom error
 * returned by {ExecutionOutput.validity}.
 */
error ValidationFailed(bytes reason);

/**
 * When payment for happyTx in {IPaymaster.payout} reverts (in violation of the spec).
 * The parameter contains the revert data, so that it can be parsed offchain.
 */
error PaymentReverted(bytes revertData);

/**
 * When payment for the happyTx from the account or paymaster failed.
 *
 * This could be because the payment was rejected (in which case `result` should contain an encoded
 * custom error) or because the payment wasn't (fully) done (in which case `result` will be
 * `abi.encodeWithSelector(bytes4(0))`.
 */
error PaymentFailed(bytes result);

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
contract HappyEntryPoint is ReentrancyGuardTransient {
    // Avoid gas exhaustion via return data.
    using ExcessivelySafeCall for address;

    // ====================================================================================================
    // CONSTANTS

    /**
     * Fixed max gas overhead for the logic around the ExcessivelySafeCall to
     * {HappyPaymaster.payout} that needs to be paid for by the payer.
     */
    uint256 private constant PAYOUT_CALL_OVERHEAD = 7000; // measured: 5038 + safety margin

    // ====================================================================================================
    // State

    mapping(address account => mapping(uint192 nonceTrack => uint64 nonceValue)) public nonceValues;

    // ====================================================================================================
    // EXTERNAL FUNCTIONS

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
        // 1. Validate gas price & validate with account

        if (tx.gasprice > happyTx.maxFeePerGas) {
            revert GasPriceTooHigh();
        }

        bool success;
        bytes memory returnData;
        bytes memory call = abi.encodeCall(IHappyAccount.validate, (happyTx));
        uint256 gasBefore = gasleft();
        (success, returnData) = happyTx.account.excessivelySafeCall(
            isSimulation && happyTx.validateGasLimit == 0 ? gasleft() : happyTx.validateGasLimit,
            0, // gas token transfer value
            256, // max return size: 32 bytes selector + 224 bytes for encoded params
            call
        );
        output.validateGas = uint32(gasBefore - gasleft());

        if (!success) revert ValidationReverted(returnData);
        output.validationStatus = abi.decode(returnData, (bytes));
        // If there is less than 4 bytes of data, the validation didn't strictly revert, however
        // it is improperly implemented.
        if (!success || output.validationStatus.length < 4) revert ValidationReverted(output.validationStatus);

        bytes4 selector;
        assembly {
            // skip outer bytes length, tuple offset, and inner bytes length
            selector := mload(add(returnData, 96))
        }

        if (selector != 0 && !(isSimulation && selector == UnknownDuringSimulation.selector)) {
            revert ValidationFailed(output.validationStatus);
        }

        // ==========================================================================================
        // 2. Validate & update nonce

        int256 expectedNonce = int256(uint256(nonceValues[happyTx.account][happyTx.nonceTrack]));
        int256 nonceAhead = int256(uint256(happyTx.nonceValue)) - expectedNonce;
        if (nonceAhead < 0 || (!isSimulation && nonceAhead != 0)) revert InvalidNonce();
        nonceValues[happyTx.account][happyTx.nonceTrack]++;
        if (selector == 0 && nonceAhead > 0) {
            output.validationStatus = abi.encodeWithSelector(FutureNonceDuringSimulation.selector);
        }

        // ==========================================================================================
        // 3. Execute the call

        call = abi.encodeCall(IHappyAccount.execute, (happyTx));
        gasBefore = gasleft();
        (success, returnData) = happyTx.account.excessivelySafeCall(
            isSimulation && happyTx.executeGasLimit == 0 ? gasleft() : happyTx.executeGasLimit,
            0, // gas token transfer value
            384, // max return size: struct encoding + 256 bytes revertData
            call
        );
        output.executeGas = uint32(gasBefore - gasleft());

        // Don't revert if execution fails, as we still want to get the payment for a reverted call.
        if (!success) {
            emit ExecutionReverted(returnData);
            output.callStatus = CallStatus.EXECUTE_REVERTED;
            output.revertData = returnData;
        } else {
            ExecutionOutput memory execOutput = abi.decode(returnData, (ExecutionOutput));
            output.callStatus = execOutput.status;
            output.revertData = execOutput.revertData;
            if (execOutput.status == CallStatus.CALL_REVERTED) {
                emit CallReverted(execOutput.revertData);
            }
        }

        // ==========================================================================================
        // 4. Collect payment

        uint256 gasBeforePayout = gasleft();

        // This is an overestimation of the actual gas cost of the submitter.
        // WITHOUT the gas cost of the "payout" call (which is accounted for later).
        uint256 consumedGas =
            HappyTxLib.txGasFromCallGas(gasStart - gasBeforePayout, 4 + encodedHappyTx.length) + PAYOUT_CALL_OVERHEAD;
        if (happyTx.paymaster == address(0)) {
            // Sponsoring submitter, no need to charge anyone
            output.gas = uint32(consumedGas);
            return output;
        }

        uint256 balance = tx.origin.balance;

        call = abi.encodeCall(IHappyPaymaster.payout, (happyTx, consumedGas));
        gasBefore = gasleft();
        (success, returnData) = happyTx.paymaster.excessivelySafeCall(
            isSimulation && happyTx.payoutGasLimit == 0 ? gasleft() : happyTx.payoutGasLimit,
            0, // gas token transfer value
            256, // max return size: 32 bytes selector + 224 bytes for encoded params
            call
        );
        if (!success) revert PaymentReverted(returnData);
        output.payoutGas = uint32(gasBefore - gasleft());
        output.payoutStatus = abi.decode(returnData, (bytes));

        uint256 payoutGas = gasBeforePayout - gasleft();
        output.gas = uint32(consumedGas + payoutGas - PAYOUT_CALL_OVERHEAD);

        // It's okay if the payment is only for the agreed-upon gas limit.
        // This should never happen if happyTx.gasLimit matches the submitter's tx gas limit.
        consumedGas = output.gas > happyTx.gasLimit ? happyTx.gasLimit : output.gas;

        // `submitterFee` can be negative (rebates) but can't charge less than 0.
        int256 _expected = int256(consumedGas * tx.gasprice) + happyTx.submitterFee;
        uint256 expected = _expected > 0 ? uint256(_expected) : 0;

        if (tx.origin.balance < balance + expected) {
            revert PaymentFailed(output.payoutStatus);
        }
    }
}
