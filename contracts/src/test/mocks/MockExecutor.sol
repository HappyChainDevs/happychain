// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {CallInfo} from "boop/core/CallInfoEncoding.sol";
import {HappyAccount} from "boop/happychain/HappyAccount.sol";
import {ICustomExecutor} from "boop/interfaces/ICustomExecutor.sol";
import {Boop, CallStatus, ExecutionOutput} from "boop/interfaces/Types.sol";

/**
 * Mock implementation of ICustomExecutor for testing purposes.
 * The execution behavior depends on the executionMode:
 * 0: Makes actual calls through the HappyAccount's executeCallFromExecutor
 * 1: Returns a failed execution status
 * 2: Reverts with a custom error
 * 3: Reverts with an empty revert
 */
contract MockExecutor is ICustomExecutor {
    // Execution mode
    uint256 public executionMode;

    // Custom error for revert mode
    error CustomErrorMockRevert();

    // Custom error to simulate invalid input being sent to the executor
    error InvalidInput();

    constructor() {
        executionMode = 0;
    }

    /**
     * Set the execution mode
     * @param _executionMode New execution mode (0=make calls, 1=fail, 2=revert with error, 3=empty revert)
     */
    function setExecutionMode(uint256 _executionMode) external {
        executionMode = _executionMode;
    }

    /**
     * Execute a transaction based on the current execution mode
     * @param boop The transaction to execute
     * @return output The execution result
     */
    function execute(Boop memory boop) external returns (ExecutionOutput memory output) {
        if (executionMode == 0) {
            // Make actual calls through the HappyAccount
            // Parse the call info from the boop
            address target = boop.dest;
            uint256 value = boop.value;
            bytes memory callData = boop.callData;

            // Execute the call through the HappyAccount
            bool success;
            bytes memory returnData;

            // Cast msg.sender to HappyAccount to call executeCallFromExecutor
            HappyAccount account = HappyAccount(payable(msg.sender));
            (success, returnData) =
                account.executeCallFromExecutor(CallInfo({dest: target, value: value, callData: callData}));

            // Set the output based on the call result
            if (success) {
                output.status = CallStatus.SUCCEEDED;
            } else {
                output.status = CallStatus.CALL_REVERTED;
                output.revertData = returnData;
            }
        } else if (executionMode == 1) {
            // Return failed execution status
            output.status = CallStatus.EXECUTE_REJECTED;
            output.revertData = abi.encodeWithSelector(InvalidInput.selector);
        } else if (executionMode == 2) {
            // Revert with custom error
            revert CustomErrorMockRevert();
        } else {
            // solhint-disable-next-line reason-string
            revert();
        }

        return output;
    }
}
