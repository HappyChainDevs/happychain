// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ExtensionType} from "boop/interfaces/Types.sol";

// ================================================================================================
// ENTRYPOINT EVENTS

/**
 * This event is emitted by {core/EntryPoint.submit} just after executing a Boop, to delimit
 * the Boop execution logs for easier indexing and improved visibility on block explorers.
 */
event BoopExecutionCompleted();

/**
 * When the {interfaces/IAccount.execute} call succeeds but reports that the
 * attempted call reverted.
 *
 * The parameter contains the revert data (truncated to 384 bytes),
 * so that it can be parsed offchain.
 */
event CallReverted(bytes revertData);

/**
 * When the {interfaces/IAccount.execute} call rejects the execution but does not revert.
 *
 * The parameter identifies the rejection reason (truncated to 256 bytes), which should be an
 * encoded custom error returned by {interfaces/IAccount.execute}.
 */
event ExecutionRejected(bytes reason);

/**
 * When the {interfaces/IAccount.execute} call reverts (in violation of the spec).
 *
 * The parameter contains the revert data (truncated to 384 bytes),
 * so that it can be parsed offchain.
 */
event ExecutionReverted(bytes revertData);

// ================================================================================================
// ENTRYPOINT ERRORS

/**
 * The entrypoint reverts with this error when {interfaces/Types.Boop}.maxFeePerGas is lower than the gas price.
 */
error GasPriceTooLow();

/**
 * The entrypoint reverts with this error if the paymaster cannot cover the gas limit cost from its
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
 * When the validation of the boop fails because the account rejects it.
 *
 * The parameter identifies the rejection reason (truncated to 256 bytes), which should be an encoded
 * custom error returned by {interfaces/IAccount.validate}.
 */
error ValidationRejected(bytes reason);

/**
 * When the paymaster validation of the boop reverts (in violation of the spec).
 *
 * The parameter contains the revert data (truncated to 256 bytes)
 */
error PaymentValidationReverted(bytes revertData);

/**
 * When the validation of the boop fails because the paymaster rejects it.
 *
 * The parameter identifies the rejection reason (truncated to 256 bytes), which should be an
 * encoded custom error returned by {interfaces/IPaymaster.validatePayment}.
 */
error PaymentValidationRejected(bytes reason);

/**
 * When self-paying and the payment from the account fails, either because {interfaces/IAccount.payout}
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
 * Selector returned by {interfaces/IAccount.validate} and
 * {interfaces/IPaymaster.validatePayment} in simulation mode if the validity of
 * the boop cannot be ascertained during simulation.
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
 * Selector returned by {interfaces/IAccount.validate}, {interfaces/ICustomValidator.validate} or
 * {interfaces/IPaymaster.validatePayment} when a signature is invalid.
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
