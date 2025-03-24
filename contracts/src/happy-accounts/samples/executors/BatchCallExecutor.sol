// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {CallStatus} from "boop/core/HappyEntryPoint.sol";
import {HappyTx} from "boop/core/HappyTx.sol";
import {ExecutionOutput} from "boop/interfaces/IHappyAccount.sol";
import {ICustomBoopExecutor} from "boop/interfaces/extensions/ICustomBoopExecutor.sol";
import {IExtensibleBoopAccount, CallInfo} from "boop/interfaces/extensions/IExtensibleBoopAccount.sol";
import {HappyTxLib} from "boop/libs/HappyTxLib.sol";
import {CallInfoCoding} from "boop/samples/executors/CallInfoCoding.sol";

/**
 * @dev Key used in {HappyTx.extraData} for call information (array of {CallInfo}),
 * to be looked up by {BatchCallExecutor.execute}.
 */
bytes3 constant BATCH_CALL_INFO_KEY = 0x000100;

/**
 * @dev Selector returned by {BatchCallExecutor.execute} when the call information is missing or
 * incorrectly encoded in {HappyTx.extraData}.
 */
error InvalidBatchCallInfo();

/**
 * This executor executes multiples calls in an atomic way (all run, or all revert).
 *
 * Each call specified is specified in a {CallInfo} struct, which are together stored in an
 * ABI-encoded array in {HappyTx.extraData}, keyed on {BATCH_CALL_INFO_KEY}.
 */
contract BatchCallExecutor is ICustomBoopExecutor {
    using CallInfoCoding for bytes;

    // ====================================================================================================
    // FUNCTIONS

    function execute(HappyTx memory happyTx) external returns (ExecutionOutput memory output) {
        // 1. Parse the extraData with a key, to retrieve the calls.
        (bool found, bytes memory _calls) = HappyTxLib.getExtraDataValue(happyTx.extraData, BATCH_CALL_INFO_KEY);

        // 2. Decode the call info.
        bool success;
        CallInfo[] memory calls;
        if (found) (success, calls) = _calls.decodeCallInfoArray();

        if (!found || !success) {
            output.status = CallStatus.EXECUTE_FAILED;
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
            CallInfo memory info = calls[i];
            (bool success, bytes memory revertData) = IExtensibleBoopAccount(account).executeCall(info);
            if (!success) {
                assembly {
                    // pass the revert data through to the caller
                    revert(add(revertData, 32), mload(revertData))
                }
            }
        }
    }
}
