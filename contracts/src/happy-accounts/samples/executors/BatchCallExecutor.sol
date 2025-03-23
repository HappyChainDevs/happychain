// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ExecutionOutput} from "../../interfaces/IHappyAccount.sol";
import {ICustomBoopExecutor} from "../../interfaces/extensions/ICustomBoopExecutor.sol";
import {HappyTx} from "../../core/HappyTx.sol";
import {HappyTxLib} from "../../libs/HappyTxLib.sol";

/**
 * @dev Key used in {HappyTx.extraData} for call information (array of {CallInfo}),
 * to be looked up by {BatchCallExecutor.execute}.
 */
bytes3 constant BATCH_CALL_INFO_KEY = 0x000100;

/**
 * @dev Selector returned by {BatchCallExecutor.execute} when no call information is found in the
 * extraData.
 */
error MissingBatchCallInfo();

/// @dev Information (destination, value and calldata) for a batched call.
struct CallInfo {
    address dest;
    uint256 value;
    bytes callData;
}

/**
 * This executor executes multiples calls in an atomic way (all run, or all revert).
 *
 * Each call specified is specified in a {CallInfo} struct, which are together stored in an
 * ABI-encoded array in {HappyTx.extraData}, keyed on {BATCH_CALL_INFO_KEY}.
 */
contract BatchCallExecutor is ICustomBoopExecutor {
    // ====================================================================================================
    // CONSTANTS

    /// @dev Gas overhead for executing the execute function, not measured by gasleft()
    uint256 private constant GAS_OVERHEAD_BUFFER = 100;

    /// @dev Overall gas overhead for the execute function, not measured by gasleft()
    uint256 private constant OVERALL_GAS_OVERHEAD_BUFFER = 500;

    // ====================================================================================================
    // EXTERNAL FUNCTIONS

    function execute(HappyTx memory happyTx) external returns (ExecutionOutput memory output) {
        // 1. Parse the extraData with a key, to retrieve the calls
        (bool found, bytes memory calls) = HappyTxLib.getExtraDataValue(happyTx.extraData, BATCH_CALL_INFO_KEY);
        if (!found) revert MissingBatchCallInfo();

        // 2. decodeBatch the bytes memory -> bytes memory[]
        CallInfo[] memory executionBatch = abi.decode(calls, (CallInfo[]));

        // 3. call _executeBatch -> executes each call individually
        return _executeBatch(executionBatch);
    }

    // ====================================================================================================
    // INTERNAL FUNCTIONS

    /// @dev Executes a batch of calls, returns the total gas used
    function _executeBatch(CallInfo[] memory executionBatch) internal returns (ExecutionOutput memory output) {
        // For each call, execute it and add the gas used to the total
        // If any call reverts, the entire batch reverts, return that call's output.revertData
        for (uint256 i = 0; i < executionBatch.length; i++) {
            ExecutionOutput memory callOutput = _execute(executionBatch[i]);
            if (callOutput.revertData.length > 0) {
                output.revertData = callOutput.revertData;
                return output;
            }

            output.gas += callOutput.gas;
        }
        output.gas += OVERALL_GAS_OVERHEAD_BUFFER;
    }

    /// @dev Executes a single call, returns the gas used
    function _execute(CallInfo memory execution) internal returns (ExecutionOutput memory output) {
        uint256 startGas = gasleft();
        (bool success, bytes memory returnData) = execution.dest.call{value: execution.value}(execution.callData);
        if (!success) {
            output.revertData = returnData;
            return output;
        }

        output.gas = startGas - gasleft() + GAS_OVERHEAD_BUFFER;
    }
}
