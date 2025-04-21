// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {CallInfoEncoding} from "boop/core/CallInfoEncoding.sol";
import {Utils} from "boop/core/Utils.sol";
import {ICustomExecutor} from "boop/interfaces/ICustomExecutor.sol";
import {IExtensibleAccount} from "boop/interfaces/IExtensibleAccount.sol";
import {Boop, CallInfo, CallStatus, ExecutionOutput} from "boop/interfaces/Types.sol";

/**
 * @dev Key used in {interfaces/Types.Boop}.extraData for call information (array of
 * {interfaces/Types.CallInfo}), to be looked up by {BatchCallExecutor.execute}.
 */
bytes3 constant BATCH_CALL_INFO_KEY = 0x000100;

/**
 * @dev Selector returned by {BatchCallExecutor.execute} when the call information is missing or
 * incorrectly encoded in {interfaces/Types.Boop}.extraData.
 */
error InvalidBatchCallInfo();

/**
 * This executor executes multiple calls in an atomic way (either all succeed, or all revert).
 *
 * Each call specified is specified in a {interfaces/Types.CallInfo} struct, which are together
 * stored in an ABI-encoded array in {interfaces/Types.Boop}.extraData, keyed on {BATCH_CALL_INFO_KEY}.
 */
contract BatchCallExecutor is ICustomExecutor {
    using CallInfoEncoding for bytes;

    // ====================================================================================================
    // FUNCTIONS

    function execute(Boop memory boop) external returns (ExecutionOutput memory output) {
        // 1. Parse the extraData with a key, to retrieve the calls.
        (bool found, bytes memory _calls) = Utils.getExtraDataValue(boop.extraData, BATCH_CALL_INFO_KEY);

        // 2. Decode the call info.
        bool success;
        CallInfo[] memory calls;
        if (found) (success, calls) = _calls.decodeCallInfoArray();

        if (!found || !success) {
            output.status = CallStatus.EXECUTE_REJECTED;
            output.revertData = abi.encodeWithSelector(InvalidBatchCallInfo.selector);
            return output;
        }

        // 3. Execute all calls and capture revert data if any.
        output.status = CallStatus.SUCCEEDED;
        try this._executeBatch(msg.sender, calls) {}
        catch (bytes memory revertData) {
            output.status = CallStatus.CALL_REVERTED;
            output.revertData = revertData;
        }
        return output;
    }

    /**
     * @dev Executes all the provided calls sequentially, reverting if any revert, with the same revert
     * data. This call is external because it needs to be able to revert if any of the call made
     * revert, without reverting the `execute` call. This is sensitive code, and can only be called
     * from this contract, which we check.
     */
    function _executeBatch(address account, CallInfo[] memory calls) external {
        require(msg.sender == address(this), "not called from self");
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory revertData) = IExtensibleAccount(account).executeCallFromExecutor(calls[i]);
            if (!success) {
                assembly ("memory-safe") {
                    // pass the revert data through to the caller
                    revert(add(revertData, 32), mload(revertData))
                }
            }
        }
    }
}
