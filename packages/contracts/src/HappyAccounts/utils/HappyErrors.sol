// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

/**
 * @title  HappyErrors
 * @dev    Error definitions for the Happy Account system
 */
library HappyErrors {
    // Account Errors
    error NotAuthorized();
    error AlreadyInitialized();
    error NotInitialized();
    error InvalidImplementation();
    error InvalidOwner();
    error InvalidFactory();
    error InvalidNonce();
    error InvalidSignature();
    error InvalidCalldata();
    error ExecutionFailed();
    error InsufficientGas();
    error GasPriceTooHigh();

    // Validation Errors
    error ValidationFailed(bytes4 errorSelector);
    error ValidationReverted(bytes revertData);
    error InvalidValidator();
    error InvalidValidationData();

    // Paymaster Errors
    error PaymasterValidationFailed(bytes4 errorSelector);
    error PaymasterValidationReverted(bytes revertData);
    error InvalidPaymaster();
    error InvalidPaymasterData();
    error PaymentFailed();
    error InsufficientPaymasterBalance();

    // Factory Errors
    error DeploymentFailed();
    error InitializationFailed();
    error InvalidSalt();

    // Guard Errors
    error GuardRejected(bytes4 errorSelector);
    error GuardReverted(bytes revertData);
    error InvalidGuard();
}
