// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ExcessivelySafeCall} from "ExcessivelySafeCall/ExcessivelySafeCall.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

import {FutureNonceDuringSimulation, UnknownDuringSimulation} from "../utils/Common.sol";
import {IHappyAccount, ExecutionOutput} from "../interfaces/IHappyAccount.sol";
import {IHappyPaymaster} from "../interfaces/IHappyPaymaster.sol";
import {HappyTxLib} from "../libs/HappyTxLib.sol";
import {HappyTx} from "./HappyTx.sol";

// [LOGGAS] import {console} from "forge-std/console.sol";

enum CallStatus {
    SUCCEEDED, // The call succeeded.
    CALL_REVERTED, // The call reverted.
    EXECUTE_FAILED, // The {IHappyAccount.execute} function failed (incorrect input).
    EXECUTE_REVERTED // The {IHappyAccount.execute} function reverted (in violation of the spec).

}

struct SubmitOutput {
    /**
     * An overestimation of the minimum gas limit necessary to successfully
     * call {EntryPoint.submit} at the top-level of a transaction.
     */
    uint32 gas;
    /**
     * An overestimation of the minimum gas limit necessary to successfully
     * call {IHappyAccount.execute} from {EntryPoint.submit}.
     */
    uint32 executeGas;
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
     * The revertData with which either the call or the
     * {IHappyAccount.execute} function reverted (when the associated
     * `callStatus` is set).
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

/// @notice The central contract that handles validation, execution, and fee payment for happyTxs.
contract HappyEntryPoint is ReentrancyGuardTransient {
    // Must be used to avoid gas exhaustion via return data.
    using ExcessivelySafeCall for address;

    // ====================================================================================================
    // CONSTANTS

    /**
     * @dev Maximum amount of data allowed to be returned from {IHappyAccount.validate}.
     * The returned data is as follows:
     * 1st slot: bytes4 selector (minimum 32 bytes are used by the error selector)
     * 2nd slot onwards: 224 bytes reserved for parameters of the error (if any)
     */
    uint16 private constant MAX_VALIDATE_RETURN_DATA_SIZE = 256;

    /**
     * @dev Maximum amount of data allowed to be returned from {IPaymaster.payout}.
     * The returned data is as follows:
     * 1st slot: bytes4 selector (minimum 32 bytes are used by the error selector)
     * 2nd slot onwards: 224 bytes reserved for parameters of the error (if any)
     */
    uint16 private constant MAX_PAYOUT_RETURN_DATA_SIZE = 256;

    /**
     * @dev Maximum amount of data allowed to be returned from {IHappyAccount.execute}
     * The encoding of the returned {ExecutionOutput} struct is as follows:
     *
     * 1st slot: Offset for the struct (returned values are encoded as a tuple)
     * 2nd slot: {ExecutionOutput.status}
     * 3rd slot: {ExecutionOutput.gas}
     * 4th slot: offset for revertData from where the struct begins
     * 5th slot: {ExecutionOutput.revertData.Length}
     * 6th slot (onwards): {ExecutionOutput.revertData} (max 256 bytes)
     */
    uint16 private constant MAX_EXECUTE_REVERT_DATA_SIZE = 416;

    /**
     * Fixed max gas overhead for the logic around the ExcessivelySafeCall to
     * {HappyPaymaster.payout} that needs to be paid for by the payer.
     */
    uint256 private constant PAYOUT_CALL_OVERHEAD = 7000; // measured: 5038 + safety margin

    /**
     * Gas buffer to ensure we have enough gas to handle post-OOG revert scenarios.
     * This amount will be reserved from the available gas for validate and payout operations.
     */
    uint256 private constant POST_OOG_GAS_BUFFER = 3000;

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

        // [LOGGAS] uint256 decodeGasEnd = gasleft();
        // [LOGGAS] console.log("HappyTxLib.decode gas usage: ", gasStart - decodeGasEnd);

        // 1. Validate happyTx with account

        if (tx.gasprice > happyTx.maxFeePerGas) {
            revert GasPriceTooHigh();
        }

        bool success;
        bytes memory returnData;
        (success, returnData) = happyTx.account.excessivelySafeCall(
            gasleft() - POST_OOG_GAS_BUFFER,
            0, // gas token transfer value
            MAX_VALIDATE_RETURN_DATA_SIZE,
            abi.encodeCall(IHappyAccount.validate, (happyTx))
        );

        if (!success) revert ValidationReverted(returnData);
        output.validationStatus = abi.decode(returnData, ((bytes)));
        // If there is less than 4 bytes of data, the validation didn't strictly revert, however
        // it is improperly implemented.
        if (!success || output.validationStatus.length < 4) revert ValidationReverted(output.validationStatus);

        bytes4 selector;
        assembly {
            // skip outer bytes length, tuple offset, and inner bytes length
            selector := mload(add(returnData, 96))
        }

        if (selector != 0) {
            bool shouldContinue = isSimulation
                && (selector == UnknownDuringSimulation.selector || selector == FutureNonceDuringSimulation.selector);

            if (!shouldContinue) revert ValidationFailed(output.validationStatus);
        }

        // 2. Execute the call

        // [LOGGAS] uint256 executeGasStart = gasleft();

        (success, returnData) = happyTx.account.excessivelySafeCall(
            // Pass the max possible gas if we need to estimate the gas limit.
            isSimulation && happyTx.executeGasLimit == 0 ? gasleft() : happyTx.executeGasLimit,
            0, // gas token transfer value
            // Allow the call revert data to take up the same size as the other revert data.
            MAX_EXECUTE_REVERT_DATA_SIZE,
            abi.encodeCall(IHappyAccount.execute, (happyTx))
        );

        // [LOGGAS] uint256 executeGasEnd = gasleft();
        // [LOGGAS] uint256 executeCallGasUsed = executeGasStart - executeGasEnd;
        // [LOGGAS] ExecutionOutput memory execOutputGasReport = abi.decode(returnData, (ExecutionOutput));
        // [LOGGAS] uint256 executeCallOverhead = executeCallGasUsed - execOutputGasReport.gas;
        // [LOGGAS] console.log("excessivelySafeCall (execute) gas usage: ", executeCallGasUsed);
        // [LOGGAS] console.log("excessivelySafeCall (execute) overhead (gas used - execOutput.gas): ", executeCallOverhead);

        // Don't revert if execution fails, as we still want to get the payment for a reverted call.
        if (!success) {
            emit ExecutionReverted(returnData);
            output.callStatus = CallStatus.EXECUTE_REVERTED;
            output.revertData = returnData;
        } else {
            ExecutionOutput memory execOutput = abi.decode(returnData, (ExecutionOutput));
            output.callStatus = execOutput.status;
            output.revertData = execOutput.revertData;
            output.executeGas = execOutput.gas;
            if (execOutput.status == CallStatus.CALL_REVERTED) {
                emit CallReverted(execOutput.revertData);
            }
        }

        // 3. Collect payment

        // [LOGGAS] uint256 txGasFromCallStart = gasleft();

        // This is an overestimation of the actual gas cost of the submitter.
        // WITHOUT the gas cost of the "payout" call (which is accounted for later).
        uint256 consumedGas =
            HappyTxLib.txGasFromCallGas(gasStart - gasleft(), 4 + encodedHappyTx.length) + PAYOUT_CALL_OVERHEAD;

        // [LOGGAS] uint256 txGasFromCallEnd = gasleft();
        // [LOGGAS] uint256 txGasFromCallUsed = txGasFromCallStart - txGasFromCallEnd;
        // [LOGGAS] console.log("txGasFromCallGas overall gas usage: ", txGasFromCallUsed);

        if (happyTx.paymaster == address(0)) {
            // Sponsoring submitter, no need to charge anyone
            output.gas = uint32(consumedGas);
            return output;
        }

        uint256 balance = tx.origin.balance;
        uint256 gasBeforePayout = gasleft();

        // [LOGGAS] uint256 payoutGasStart = gasleft();

        (success, returnData) = happyTx.paymaster.excessivelySafeCall(
            gasleft() - POST_OOG_GAS_BUFFER,
            0, // gas token transfer value
            MAX_PAYOUT_RETURN_DATA_SIZE,
            abi.encodeCall(IHappyPaymaster.payout, (happyTx, consumedGas))
        );
        if (!success) revert PaymentReverted(returnData);
        output.payoutStatus = abi.decode(returnData, (bytes));

        // [LOGGAS] uint256 payoutGasEnd = gasleft();
        // [LOGGAS] uint256 payoutCallGasUsed = payoutGasStart - payoutGasEnd;
        // [LOGGAS] uint256 payoutLogicGasUsage = happyTx.account == happyTx.paymaster ? 9782 : 10104;
        // ^From the happy_aa_gas_report.txt
        // [LOGGAS] uint256 payoutCallOverhead = payoutCallGasUsed - payoutLogicGasUsage;
        // [LOGGAS] console.log("excessivelySafeCall  (payout) gas usage: ", payoutCallGasUsed);
        // [LOGGAS] console.log("excessivelySafeCall  (payout) overhead (gas used - payout logic gas usage): ", payoutCallOverhead);

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
