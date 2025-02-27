// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "oz-upgradeable/access/OwnableUpgradeable.sol";

import {ExecutionOutput} from "../../interfaces/IHappyAccount.sol";
import {ICustomBoopExecutor} from "../../interfaces/extensions/ICustomBoopExecutor.sol";

import {HappyTx} from "../../core/HappyTx.sol";
import {HappyTxLib} from "../../libs/HappyTxLib.sol";

/// @dev The execution data of a call in a batch
struct Execution {
    address dest;
    uint256 value;
    bytes callData;
}

contract BatchCallExecutor is ICustomBoopExecutor, ReentrancyGuardTransient, OwnableUpgradeable, UUPSUpgradeable {
    // ====================================================================================================
    // CONSTANTS

    /// @dev Gas overhead for executing the execute function, not measured by gasleft()
    uint256 private constant GAS_OVERHEAD_BUFFER = 100;

    // ====================================================================================================
    // CONSTRUCTOR

    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
    }

    // ====================================================================================================
    // EXTERNAL FUNCTIONS

    function execute(HappyTx memory happyTx) external returns (ExecutionOutput memory output) {
        // 1. Parse the extraData with a key, to retrieve the calls
        (bool found, bytes memory calls) = HappyTxLib.getExtraDataValue(happyTx.extraData, 0x000100); // BatchCall key
        require(found, "BatchCall not found");
        // 2. decodeBatch the bytes memory -> bytes memory[]
        Execution[] memory executionBatch = abi.decode(calls, (Execution[]));
        // 3. call _executeBatch -> executes each call individually
        output = _executeBatch(executionBatch);
        // 4. return the output
        // TODO output.gas += OVERALL_GAS_OVERHEAD_BUFFER; (gas used for this function + _executeBatch's for loop maybe)
        // TODO , OR return directly inline
        // return _executeBatch(executionBatch) + OVERALL_GAS_OVERHEAD_BUFFER;
    }

    // ====================================================================================================
    // INTERNAL FUNCTIONS

    /// @dev Executes a batch of calls, returns the total gas used
    function _executeBatch(Execution[] memory executionBatch) internal returns (ExecutionOutput memory output) {
        // For each call, execute it and add the gas used to the total
        // Return the total gas used
        // If any call reverts, the entire batch reverts, return that calls output.revertData
        for (uint256 i = 0; i < executionBatch.length; i++) {
            ExecutionOutput memory callOutput = _execute(executionBatch[i]);
            if (callOutput.revertData.length > 0) {
                output.revertData = callOutput.revertData;
                return output;
            }

            output.gas += callOutput.gas;
        }
    }

    /// @dev Executes a single call, returns the gas used
    function _execute(Execution memory execution) internal returns (ExecutionOutput memory output) {
        uint256 startGas = gasleft();
        (bool success, bytes memory returnData) = execution.dest.call{value: execution.value}(execution.callData);
        if (!success) {
            output.revertData = returnData;
            return output;
        }

        output.gas = startGas - gasleft() + GAS_OVERHEAD_BUFFER;
    }

    /*
    OR, maybe we just have one function, saves on call/jump gas to _execute for each call
    function _executeBatch(Execution[] memory executionBatch) internal returns (ExecutionOutput memory output) {
        uint256 totalGas = 0;
        
        for (uint256 i = 0; i < executionBatch.length; i++) {
            uint256 startGas = gasleft();
            
            // Execute the call
            (bool success, bytes memory result) = executionBatch[i].dest.call{value: executionBatch[i].value}(
                executionBatch[i].callData
            );
            
            // Calculate gas used for this call
            uint256 gasUsed = startGas - gasleft() + GAS_OVERHEAD_BUFFER;
            totalGas += gasUsed;
            
            // If any call fails, return immediately with the error
            if (!success) {
                output.revertData = result;
                output.gas = totalGas;
                return output;
            }
        }
        
        // All calls succeeded
        output.gas = totalGas;
        return output;
    }
    */

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
