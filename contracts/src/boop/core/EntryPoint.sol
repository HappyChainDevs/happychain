// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ExcessivelySafeCall} from "ExcessivelySafeCall/ExcessivelySafeCall.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

import {Utils} from "./Utils.sol";
import {Encoding} from "./Encoding.sol";

import {Staking} from "boop/core/Staking.sol";
import {IAccount} from "boop/interfaces/IAccount.sol";
import {IPaymaster} from "boop/interfaces/IPaymaster.sol";
import {
    BoopSubmitted,
    CallReverted,
    ExecutionRejected,
    ExecutionReverted,
    GasPriceTooHigh,
    InsufficientStake,
    InvalidNonce,
    ValidationReverted,
    ValidationRejected,
    PaymentValidationReverted,
    PaymentValidationRejected,
    PayoutFailed,
    UnknownDuringSimulation
} from "boop/interfaces/EventsAndErrors.sol";
import {Boop, CallStatus, Validity, SubmitOutput} from "boop/interfaces/Types.sol";

/// @notice cf. {EntryPoint.submit}
contract EntryPoint is Staking, ReentrancyGuardTransient {
    // Avoid gas exhaustion via return data.
    using ExcessivelySafeCall for address;

    // ====================================================================================================
    // STATE

    mapping(address account => mapping(uint192 nonceTrack => uint64 nonceValue)) public nonceValues;

    // ====================================================================================================
    // SUBMIT

    /**
     * Execute a Boop, and tries to ensure that the submitter (tx.origin) receives payment for
     * submitting the transaction.
     *
     * This function immediately reverts or emits the errors and events defined in this file
     * whenever the associated condition is hit.
     *
     * This function will also, in this order:
     *
     * 1. Validate the gas price, check the paymaster's staking balance, validate and update the
     *    nonce.
     *
     * 2. Call the account to validate the boop.
     *    See {IAccount.validate} for compliant behaviour.
     *
     * 3. Call the paymaster to validate payment.
     *    See {IPaymaster.validatePayment} for compliant behaviour.
     *
     * 4. Call the account to execute the transaction.
     *    See {IAccount.execute} for compliant behaviour.
     *
     * 5. Collect payment from the paymaster or account.
     *    Payment is taken from the paymaster's stake or sollicated from the account by calling
     *    {IAccount.payout}.
     *
     * Gas estimation is possible by doing an `eth_call` on this function with `address(0)` as the
     * sender (`tx.origin`), as this scenario is impossible onchain. We call this "simulation mode".
     *
     * In simulation mode, this function must ignore rejections (but not reverts) from account and
     * paymaster validation if their results are the encoded {UnknownDuringSimulation} or
     * {FutureNonceDuringSimulation} errors.
     *
     * The function returns a filled-in {SubmitOutput} structure. This is needed during simulation,
     * as the logs are not available with `eth_call`.
     *
     * NOTE: When `eth_simulateV1` (which does allow simple RPC log access) becomes broadly
     * available, the `SubmitOutput` structure can be removed entirely, and the function doesn't
     * need to return anything. Also note that `debug_traceCall` is not an acceptable substitute,
     * given that it requires a custom tracer and that those are incompatible between node
     * implementations.
     */
    function submit(bytes calldata encodedBoop) external nonReentrant returns (SubmitOutput memory output) {
        uint256 gasStart = gasleft();
        Boop memory boop = Encoding.decode(encodedBoop);
        bool isSimulation = tx.origin == address(0);

        // ==========================================================================================
        // 1. Validate gas price & paymaster balance, validate & update nonce

        if (tx.gasprice > boop.maxFeePerGas) {
            revert GasPriceTooHigh();
        }

        if (boop.paymaster != address(0) && boop.paymaster != boop.account) {
            if (stakes[boop.paymaster].balance < boop.gasLimit * tx.gasprice) {
                revert InsufficientStake();
            }
        }

        int256 expectedNonce = int256(uint256(nonceValues[boop.account][boop.nonceTrack]));
        int256 nonceAhead = int256(uint256(boop.nonceValue)) - expectedNonce;
        if (nonceAhead < 0 || (!isSimulation && nonceAhead != 0)) revert InvalidNonce();
        if (nonceAhead > 0) output.futureNonceDuringSimulation = true;
        nonceValues[boop.account][boop.nonceTrack]++;

        // ==========================================================================================
        // 2. Validate with account

        (Validity result, uint32 gasUsed, bytes memory revertData) =
            _validate(IAccount.validate.selector, boop, boop.validateGasLimit);

        if (result == Validity.CALL_REVERTED) revert ValidationReverted(revertData);
        if (result == Validity.INVALID_RETURN_DATA) revert ValidationReverted(revertData);
        if (result == Validity.VALIDATION_REJECTED) revert ValidationRejected(revertData);
        if (result == Validity.UNKNOWN_DURING_SIMULATION) {
            output.validityUnknownDuringSimulation = true;
        }
        output.validateGas = gasUsed;

        // ==========================================================================================
        // 3. Validate with paymaster (if specified)

        if (boop.paymaster != address(0) && boop.paymaster != boop.account) {
            (result, gasUsed, revertData) =
                _validate(IPaymaster.validatePayment.selector, boop, boop.validatePaymentGasLimit);

            if (result == Validity.CALL_REVERTED) revert PaymentValidationReverted(revertData);
            if (result == Validity.INVALID_RETURN_DATA) revert PaymentValidationReverted(revertData);
            if (result == Validity.VALIDATION_REJECTED) revert PaymentValidationRejected(revertData);
            if (result == Validity.UNKNOWN_DURING_SIMULATION) {
                output.paymentValidityUnknownDuringSimulation = true;
            }
            output.paymentValidateGas = gasUsed;
        }

        // ==========================================================================================
        // 4. Execute the call

        bytes memory executeCallData = abi.encodeCall(IAccount.execute, (boop));
        uint256 gasBeforeExecute = gasleft();
        (bool success, bytes memory returnData) = boop.account.excessivelySafeCall(
            isSimulation && boop.executeGasLimit == 0 ? gasleft() : boop.executeGasLimit,
            0, // gas token transfer value
            384, // max return size: struct encoding + 256 bytes revertData
            executeCallData
        );
        output.executeGas = uint32(gasBeforeExecute - gasleft());

        // Don't revert if execution fails, as we still want to get the payment for a reverted call.
        if (!success) {
            emit ExecutionReverted(returnData);
            output.callStatus = CallStatus.EXECUTE_REVERTED;
            output.revertData = returnData;
        } else {
            (output.callStatus, output.revertData) = _parseExecutionOutput(returnData);
            if (output.callStatus == CallStatus.CALL_REVERTED) {
                emit CallReverted(output.revertData);
            } else if (output.callStatus == CallStatus.EXECUTE_REJECTED) {
                emit ExecutionRejected(output.revertData);
            }
        }

        // ==========================================================================================
        // 5. Emit Boop Submitted

        _emitBoopSubmitted(boop);

        // ==========================================================================================
        // 6. Collect payment

        uint128 cost;

        if ( /* sponsoring submitter */ boop.paymaster == address(0)) {
            output.gas = Utils.estimateSubmitterTxGas(gasStart - gasleft(), encodedBoop.length);
            // done!
        } else if ( /* self-paying */ boop.paymaster == boop.account) {
            uint256 balance = tx.origin.balance;
            uint256 gasBeforePayout = gasleft();
            // The constant 15000 overestimates the cost of the rest of execution, including
            // 9300 gas of the value transfer.
            (output.gas, cost) = _computeCost(boop, gasStart - gasBeforePayout + 15000, encodedBoop.length);
            (success,) = boop.account.excessivelySafeCall(
                gasleft() - 3000, // an OOG buffer
                0, // value
                0, // maxCopy
                abi.encodeWithSelector(IAccount.payout.selector, cost)
            );
            if (
                !success || gasBeforePayout - gasleft() > 15000 || (tx.origin.balance < balance + cost)
            ) {
                revert PayoutFailed();
            }
        } /* paymaster */ else {
            // The constant 16000 overestimates the the cost of the rest of execution, including
            // - 2900 gas for writing to stake.balance (warm)
            // - 100 gas for reading stake.balance (warm)
            // - 2100 gas for reading stake.unlockedBalance (cold)
            // - 9100 gas for the value transfer
            (output.gas, cost) = _computeCost(boop, gasStart - gasleft() + 16000, encodedBoop.length);
            // Pay submitter — no need for revert checks (submitter wants this to succeed).
            // This should succeed by construction, because of the early staking balance check.
            _transferTo(boop.paymaster, payable(tx.origin), cost);
        }
    }

    // ====================================================================================================
    // HELPERS

    /**
     * Given a boop, the gas consumed by the entrypoint body (metered until the _computeCost call
     * + estimation of the rest of execution) and its encoded length, returns an estimation of the
     * gas consumed by the submitter transaction (including intrinsic gas and data gas) and the
     * total cost to charge to the fee payer.
     */
    function _computeCost(Boop memory boop, uint256 entryPointGas, uint256 encodedLength)
        internal
        view
        returns (uint32 consumedGas, uint128 cost)
    {
        consumedGas = Utils.estimateSubmitterTxGas(entryPointGas, encodedLength);

        // Upper-bound the payment to the agree-upon gas limit.
        uint256 boundedGas = consumedGas > boop.gasLimit ? boop.gasLimit : consumedGas;
        int256 gasCost = int256(boundedGas * tx.gasprice);

        // The submitter fee can be negative (rebates) but we can't charge less than 0.
        cost = gasCost + boop.submitterFee > 0 ? uint128(uint256(gasCost + boop.submitterFee)) : 0;

        return (consumedGas, cost);
    }

    /**
     * This function abstracts common boilerplate for calling {IAccount.validate} and
     * {IPaymaster.validatePayment}.
     *
     * It attempts to call the given function and returns the appropriate {Validity} status, the
     * call's gas consumption, and data to be passed to a revert if appropriate.
     */
    function _validate(bytes4 fn, Boop memory boop, uint256 gasLimit)
        internal
        returns (Validity result, uint32 gasUsed, bytes memory revertData)
    {
        bool isSimulation = tx.origin == address(0);
        if (isSimulation && gasLimit == 0) gasLimit = gasleft();
        address targetAddress = fn == IAccount.validate.selector ? boop.account : boop.paymaster;
        bytes memory callData = abi.encodeWithSelector(fn, boop);

        uint256 gasBefore = gasleft();
        // max return size: 320, leaving 256 bytes usable for an encoded error
        (bool success, bytes memory returnData) =
            targetAddress.excessivelySafeCall(gasLimit, /* value: */ 0, 320, callData);
        gasUsed = uint32(gasBefore - gasleft());

        if (!success) return (Validity.CALL_REVERTED, gasUsed, returnData);

        bytes4 selector;
        bytes memory status;
        assembly ("memory-safe") {
            // Decoding the return data of a `returns (bytes memory)` function.
            // 0: outer bytes length, 32: inner bytes offset, 64: inner bytes length: 96: content
            // If returnData is too short, this might read garbage, but will not revert.
            // We avoid `abi.decode(returnData, (bytes))` because it can revert.
            status := add(returnData, 64)
            selector := mload(add(returnData, 96))
        }

        if (returnData.length < 96 || status.length < 4 || status.length > 256) {
            // only 256 bytes were copied, and there's 64 for tuple offset and inner bytes length
            return (Validity.INVALID_RETURN_DATA, gasUsed, returnData);
        } else if (isSimulation && selector == UnknownDuringSimulation.selector) {
            return (Validity.UNKNOWN_DURING_SIMULATION, gasUsed, "");
        } else if (selector != 0) {
            return (Validity.VALIDATION_REJECTED, gasUsed, status);
        } else {
            return (Validity.SUCCESS, gasUsed, "");
        }
    }

    /**
     * Parses the {ExecutionOutput} returned by {IAccount.execute} without reverting, which
     * `abi.decode` can't do. A malicious input can't hurt us: at worse we'll read garbage (but the
     * function could have returned garbage if it wanted to).
     */
    function _parseExecutionOutput(bytes memory returnData)
        internal
        pure
        returns (CallStatus status, bytes memory revertData)
    {
        uint256 revertDataSize;
        assembly ("memory-safe") {
            // skip outer bytes length and struct offset, read status
            status := mload(add(returnData, 64))
            // skip output status and bytes offset, read size
            revertDataSize := mload(add(returnData, 128))
        }
        if (revertDataSize > 256) revertDataSize = 256; // copy only what we have
        revertData = new bytes(revertDataSize);
        assembly ("memory-safe") {
            mcopy(add(revertData, 32), add(returnData, 160), revertDataSize)
        }
        if (status > CallStatus.EXECUTE_REVERTED) {
            // The returned status is incorrect, treat this like a revert.
            status = CallStatus.EXECUTE_REVERTED;
        }
    }

    /**
     * Emits an {BoopSubmittedEvent} containing the struct. This needs assembly, as Solidity
     * can handle max 15 arguments before running out of stack space (irrespective of context).
     */
    function _emitBoopSubmitted(Boop memory boop) internal {
        // Structs are encoded as tuples, just like events, and the signature of the event matches
        // that of the struct. The only difference is that the struct is prefixed with an offset.
        bytes memory args = abi.encode(boop);
        bytes32 topic = BoopSubmitted.selector;
        assembly {
            let data := add(args, 64) // skip bytes length and offset to struct
            let size := sub(mload(args), 32) // length of the bytestring minus size of offset
            log1(data, size, topic)
        }
    }
}
