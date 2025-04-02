// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "boop/core/HappyTx.sol";
import {CallInfo} from "boop/libs/CallInfoCodingLib.sol";
import {CallStatus} from "boop/core/HappyEntryPoint.sol";
import {ScrappyAccount} from "boop/samples/ScrappyAccount.sol";
import {ExecutionOutput} from "boop/interfaces/IHappyAccount.sol";
import {ICustomBoopExecutor} from "boop/interfaces/extensions/ICustomBoopExecutor.sol";

/**
 * Mock implementation of ICustomBoopExecutor for testing purposes.
 * The execution behavior depends on the executionMode:
 * 0: Makes actual calls through the ScrappyAccount's executeCallFromExecutor
 * 1: Returns a failed execution status
 * 2: Reverts with a custom error
 * 3: Reverts with an empty revert
 */
contract MockExecutor is ICustomBoopExecutor {
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
     * @param happyTx The transaction to execute
     * @return output The execution result
     */
    function execute(HappyTx memory happyTx) external returns (ExecutionOutput memory output) {
        if (executionMode == 0) {
            // Make actual calls through the ScrappyAccount
            // Parse the call info from the happyTx
            address target = happyTx.dest;
            uint256 value = happyTx.value;
            bytes memory callData = happyTx.callData;

            // Execute the call through the ScrappyAccount
            bool success;
            bytes memory returnData;

            // Cast msg.sender to ScrappyAccount to call executeCallFromExecutor
            ScrappyAccount account = ScrappyAccount(payable(msg.sender));
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
            output.status = CallStatus.EXECUTE_FAILED;
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
