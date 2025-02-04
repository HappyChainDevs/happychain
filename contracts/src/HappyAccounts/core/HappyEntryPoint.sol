// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ExcessivelySafeCall} from "ExcessivelySafeCall/ExcessivelySafeCall.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

import {FutureNonceDuringSimulation, UnknownDuringSimulation} from "../utils/Common.sol";
import {IHappyAccount, ExecutionOutput} from "../interfaces/IHappyAccount.sol";
import {IHappyPaymaster} from "../interfaces/IHappyPaymaster.sol";
import {HappyTxLib} from "../libs/HappyTxLib.sol";
import {HappyTx} from "./HappyTx.sol";

enum CallStatus {
    SUCCESS, // The call succeeded.
    CALL_REVERTED, // The call reverted.
    EXECUTION_REVERTED // The {@link IHappyAccount.execute} function reverted (in violation of the spec).

}

struct SubmitOutput {
    /**
     * An overestimation of the minimum gas limit necessary to successfully
     * call {@link EntryPoint.submit} at the top-level of a transaction.
     */
    uint32 gas;
    /**
     * An overestimation of the minimum gas limit necessary to successfully
     * call {@link IHappyAccount.execute} from {@link EntryPoint.submit}.
     */
    uint32 executeGas;
    /**
     * Return value of {@link IHappyAccount.validate}.
     *
     * This is either 0 (success), {@link UnknownDuringSimulation}, indicating
     * that more data is needed (e.g. a signature over the gas fields) but gas could
     * still be estimated, or {@link FutureNonceDuringSimulation}, indicating that
     * the transaction is valid but can't be submitted until the nonce matches.
     */
    bytes4 validationStatus;
    /**
     * Status of the call specified by the happy tx.
     */
    CallStatus callStatus;
    /**
     * The revertData with which either the call or the
     * {@link IHappyAccount.execute} function reverted (when the associated
     * `callStatus` is set).
     */
    bytes revertData;
}

/*
 * When the account validation of the happyTx reverts (in violation of the spec).
 *
 * The parameter contains the revert data (truncated to {@link MAX_RETURN_DATA}
 * bytes, so that it can be parsed offchain.
 */
error ValidationReverted(bytes revertData);

/*
 * When the account validation of the happyTx fails.
 *
 * The parameter identifies the revert reason, which should be a custom error
 * selector returned in {@link ExecutionOutput.validity}.
 */
error ValidationFailed(bytes4 reason);

/*
 * When payment for the happyTx ({@link IPaymaster.payout}) reverts
 * (in violation of the spec).
 *
 * The parameter contains the revert data, so that it can be parsed offchain.
 */
error PaymentReverted(bytes revertData);

/*
 * When payment for the happyTx from the account or paymaster failed.
 *
 * This could be because the payment was rejected (in which case `result`
 * will be non-zero and should contain a custom error's selector) or because
 * the payment wasn't (fully) done.
 */
error PaymentFailed(bytes4 result);

/*
 * When the {@link IHappyAccount.execute} call succeeds but reports that the
 * attempted call reverted.
 *
 * The parameter contains the revert data (truncated to {@link MAX_RETURN_DATA}
 * bytes, so that it can be parsed offchain.
 */
event CallReverted(bytes revertData);

/*
 * When the {@link IHappyAccount.execute} call reverts (in violation of the spec).
 *
 * The parameter contains the revert data (truncated to {@link MAX_RETURN_DATA}
 * bytes, so that it can be parsed offchain.
 */
event ExecutionReverted(bytes revertData);

contract HappyEntryPoint is ReentrancyGuardTransient {
    // Must use to avoid gas exhaustion via return data.
    using ExcessivelySafeCall for address;

    // TODO: does the ExcessivelySafeCall limit include the 32 bytes of length?
    //  ANS: Yes, it does store the length of the returnData here.
    /**
     * ``` temp
     *     bytes memory _returnData = new bytes(_maxCopy);
     *     ...
     *     // Store the length of the copied bytes
     *     mstore(_returnData, _toCopy) // Uses first 32 bytes to store the length
     *     ...
     *     returndatacopy(add(_returnData, 0x20), 0, _toCopy) // Then copies the calldata from 0x20
     * ```
     */

    /*
     * Maximum amount of data allowed to be returned from {@link IHappyAccount}
     * and {@link IHappyPaymaster} functions.
     */
    uint16 private constant MAX_RETURN_DATA = 1234; // TODO

    /*
     * Fixed max gas overhead for the logic around the {@link HappyPaymaster.payout}
     * call, that needs to be paid for by the payer.
     */
    uint256 private constant PAYOUT_OVERHEAD = 1234; // TODO

    /*
     * Execute a Happy Transaction, and tries to ensure that the submitter
     * (tx.origin) receives payment for submitting the transaction.
     *
     * This function immediately reverts or emits the errors and events defined
     * in this file whenever the associated condition is hit.
     *
     * This function will also, in this order:
     *
     * 1. Call the account to validate the happyTx.
     *    See {@link IHappyAccount#validate} for compliant behaviour.
     *
     * 2. Call the account to execute the transaction.
     *    See {@link IHappyAccount#execute} for compliant behaviour.
     *
     * 3. Produce a slight overestimation of the gas cost of submitting this
     *    transaction, and charge it either to the paymaster (which can be the
     *    account itself) by calling its {@link IPaymaster#payout} function.
     *    The paymaster must pay this amount + the cost of the `payout` call.
     *
     * Gas estimation is then possible by doing an `eth_call` on this function
     * with `address(0)` as the sender (`tx.origin`) -— as this scenario is
     * impossible onchain. We call this "simulation mode".
     *
     * In simulation mode, this function must ignore failed (but not
     * reverted) account and paymaster validation if their result is
     * the selector of {@link UnknownDuringSimulation} or
     * {@link FutureNonceDuringSimulation}.
     *
     * Note that the function actually ignores the return value of `payout` as
     * long as the payment is effectively made.
     *
     * The function returns a filled-in {@link SubmitOutput} structure.
     * This is needed during simulation, as the logs are not available with
     * `eth_call`.
     *
     * NOTE: When `eth_simulateV1` (which does allow simple RPC log access)
     * becomes broadly available, the `SubmitOutput` structure can be removed
     * entirely, and the function doesn't need to return anything.
     * Also note that `debug_traceCall` is not an acceptable substitute, given
     * that it requires a custom tracer and that those are incompatible between
     * node implementations.
     *
     */
    function submit(HappyTx calldata happyTx) external nonReentrant returns (SubmitOutput memory output) {
        uint256 gasStart = gasleft();
        // HappyTx memory happyTx = HappyTxLib.decode(encodedHappyTx);

        // 1. Validate happyTx with account

        bool success;
        bytes memory returnData;
        (success, returnData) = happyTx.account.excessivelySafeCall(
            happyTx.executeGasLimit,
            0,
            MAX_RETURN_DATA,
            abi.encodeWithSelector(IHappyAccount.validate.selector, happyTx)
        );
        if (!success) revert ValidationReverted(returnData);

        bytes4 result = abi.decode(returnData, (bytes4));
        if (result != 0) {
            // solhint-disable-next-line avoid-tx-origin
            bool shouldContinue = tx.origin == address(0)
                && (result == UnknownDuringSimulation.selector || result == FutureNonceDuringSimulation.selector);

            if (!shouldContinue) revert ValidationFailed(result);
        }
        output.validationStatus = result;

        // 2. Execute the call

        (success, returnData) = happyTx.account.excessivelySafeCall(
            // Pass the max possible gas if we need to estimate the gas limit.
            tx.origin == address(0) && happyTx.executeGasLimit == 0 ? gasleft() : happyTx.executeGasLimit,
            0,
            // Allow the call revert data to take up the same size as the other revert data.
            MAX_RETURN_DATA + 32,
            abi.encodeWithSelector(IHappyAccount.execute.selector, happyTx)
        );

        // Don't revert, as we still want to get the payment for a reverted call.
        ExecutionOutput memory execOutput = abi.decode(returnData, (ExecutionOutput));
        if (!success) {
            emit ExecutionReverted(returnData);
            output.callStatus = CallStatus.EXECUTION_REVERTED;
            output.revertData = returnData;
        } else if (execOutput.revertData.length != 0) {
            emit CallReverted(execOutput.revertData);
            output.callStatus = CallStatus.CALL_REVERTED;
            output.revertData = execOutput.revertData;
        } else {
            output.callStatus = CallStatus.SUCCESS;
        }

        // 3. Collect payment

        // This is an overestimation of the actual gas cost of the submitter.
        // WITHOUT the gas cost of the "payout" call (which is accounted for later).
        uint256 consumedGas = HappyTxLib.txGasFromCallGas(gasStart - gasleft(), 4) + PAYOUT_OVERHEAD;

        if (happyTx.paymaster == address(0)) {
            // Sponsoring submitter, no need to charge anyone
            output.gas = uint32(consumedGas);
            return output;
        }

        // solhint-disable-next-line avoid-tx-origin
        uint256 balance = tx.origin.balance;
        uint256 gasBeforePayout = gasleft();
        (success, returnData) = happyTx.paymaster.excessivelySafeCall(
            happyTx.executeGasLimit,
            0,
            MAX_RETURN_DATA,
            abi.encodeWithSelector(IHappyPaymaster.payout.selector, happyTx, consumedGas)
        );

        if (!success) revert PaymentReverted(returnData);

        uint256 payoutGas = gasBeforePayout - gasleft();
        output.gas = uint32(consumedGas + payoutGas);

        // It's okay if the payment is only for the agreed-upon gas limit.
        // This should never happen if happyTx.gasLimit matches the submitter's tx gas limit.
        consumedGas = consumedGas + payoutGas > happyTx.gasLimit ? happyTx.gasLimit : payoutGas;
        int256 _charged = int256(consumedGas * tx.gasprice) + happyTx.submitterFee;
        uint256 charged = _charged > 0 ? uint256(_charged) : 0;

        result = abi.decode(returnData, (bytes4));
        if (tx.origin.balance < balance + charged) {
            revert PaymentFailed(result);
        }
    }
}
