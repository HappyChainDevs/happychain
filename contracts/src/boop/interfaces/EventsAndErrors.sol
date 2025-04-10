// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ExtensionType} from "boop/interfaces/Types.sol";

// ================================================================================================
// ENTRYPOINT EVENTS

/**
 * This event exposes a Boop as an event and is emitted by {EntryPoint.submit}, for easier
 * indexing of Boops and easier visibility on block explorers.
 *
 * @dev We deliberately choose to separate all the fields into dedicated arguments instead of
 * having a single argument with the struct — this enables better display on some block explorers
 * like Blockscout.
 */
event BoopSubmitted(
    address account,
    uint32 gasLimit,
    uint32 validateGasLimit,
    uint32 executeGasLimit,
    uint32 validatePaymentGasLimit,
    address dest,
    address paymaster,
    uint256 value,
    uint192 nonceTrack,
    uint64 nonceValue,
    uint256 maxFeePerGas,
    int256 submitterFee,
    bytes callData,
    bytes paymasterData,
    bytes validatorData,
    bytes extraData
);

/**
 * When the {IAccount.execute} call succeeds but reports that the
 * attempted call reverted.
 *
 * The parameter contains the revert data (truncated to 384 bytes),
 * so that it can be parsed offchain.
 */
event CallReverted(bytes revertData);

/**
 * When the {IAccount.execute} call fails but does not revert.
 *
 * The parameter identifies the revert reason (truncated to 256 bytes), which should be an encoded
 * custom error returned by {IAccount.execute}.
 */
event ExecutionFailed(bytes reason);

/**
 * When the {IAccount.execute} call reverts (in violation of the spec).
 *
 * The parameter contains the revert data (truncated to 384 bytes),
 * so that it can be parsed offchain.
 */
event ExecutionReverted(bytes revertData);

// ================================================================================================
// ENTRYPOINT ERRORS

/**
 * The entrypoint reverts with this error when the gas price exceed {Boop.maxFeePerGas}.
 */
error GasPriceTooHigh();

/**
 * The entrypoint reverts with this error if the paymaster cannot cover the gas limit cost from his
 * stake.
 */
error InsufficientStake();

/**
 * The entrypoint reverts with this error if the nonce fails to validate.
 * This indicates an invalid nonce that cannot be used now or (in simulation mode) in the future.
 */
error InvalidNonce();

/**
 * When the account validation of the boop reverts (in violation of the spec).
 *
 * The parameter contains the revert data (truncated to 256 bytes).
 */
error ValidationReverted(bytes revertData);

/**
 * When the account validation of the boop fails.
 *
 * The parameter identifies the revert reason (truncated to 256 bytes), which should be an encoded
 * custom error returned by {IAccount.validate}.
 */
error ValidationFailed(bytes reason);

/**
 * When the paymaster validation of the boop reverts (in violation of the spec).
 *
 * The parameter contains the revert data (truncated to 256 bytes)
 */
error PaymentValidationReverted(bytes revertData);

/**
 * When the paymaster validation of the boop fails.
 *
 * The parameter identifies the revert reason (truncated to 256 bytes), which should be an encoded
 * custom error returned by {IPaymaster.validatePayment}.
 */
error PaymentValidationFailed(bytes reason);

/**
 * When self-paying and the payment from the account fails, either because {IAccount.payout}
 * reverts, consumes too much gas, or does not transfer the full cost to the submitter.
 */
error PayoutFailed();

// =================================================================================================
// SHARED EVENTS

/**
 * Emitted by accounts and paymasters when the gas token is received by the contract.
 */
event Received(address sender, uint256 amount);

// =================================================================================================
// SHARED ERRORS

/**
 * Selector returned by {IAccount.validate} and
 * {IPaymaster.payout} in simulation mode if the validity of the boop
 * cannot be ascertained during simulation.
 *
 * e.g. we can't verify a signature over the gas limit during simulation,
 * as simulation is used to estimate the gas.
 */
error UnknownDuringSimulation();

/**
 * Functions that are supposed to be called from the EntryPoint contract but are not
 * should *revert* with this error.
 */
error NotFromEntryPoint();

/**
 * Selector returned by {IAccount.validate}, {ICustomValidator.validate} or
 * {IPaymaster.validatePayment} when a signature is invalid.
 */
error InvalidSignature();

// =================================================================================================
// EXTENSIONS ERRORS

/**
 * Thrown when calling addExtension with an already-registered extension.
 */
error ExtensionAlreadyRegistered(address extension, ExtensionType extensionType);

/**
 * Thrown when calling removeExtension with an unregistered extension, or returned by account
 * functions if an extension is specified for use in the extraData, but isn't registered.
 */
error ExtensionNotRegistered(address extension, ExtensionType extensionType);

/**
 * Selector returned by extension functions and account functions if an extraData value read by an
 * extension is invalid.
 */
error InvalidExtensionValue();
