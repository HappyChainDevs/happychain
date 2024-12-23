// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

/**
 * @title  HappyEvents
 * @dev    Centralized event definitions for the Happy Account system
 */
library HappyEvents {
    // Account Events
    event AccountCreated(address indexed account, bytes initData, bytes32 salt);
    event AccountInitialized(address indexed account, address indexed owner);
    event AccountUpgraded(address indexed account, address indexed implementation);
    event AccountExecuted(address indexed account, address indexed dest, uint256 value, bytes4 selector);
    event NonceUsed(address indexed account, uint64 indexed track, uint64 nonce);

    // Validation Events
    event ValidationSuccess(address indexed validator, address indexed account);
    event ValidationFailed(address indexed validator, address indexed account, bytes4 errorSelector);

    // Paymaster Events
    event PaymasterValidationSuccess(address indexed paymaster, address indexed account);
    event PaymasterValidationFailed(address indexed paymaster, address indexed account, bytes4 errorSelector);
    event PaymasterPaid(address indexed paymaster, address indexed account, uint256 actualCost);
    event PaymasterPaymentShort(address indexed paymaster, uint256 shortAmount);
}
