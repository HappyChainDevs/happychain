// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

/// Each of these values is shared between at least two or more of IHappyPaymaster,
/// IHappyAccount, and HappyEntryPoint contracts.

// ====================================================================================================
// ERRORS

/**
 * Selector returned by {IHappyAccount.validate} in simulation mode if the
 * nonce can be valid in the future but is not the current nonce (and so the happyTx
 * would fail if submitted before the ones matching missing nonces).
 *
 * This error is used during simulation to indicate that a transaction will be valid
 * once its nonce matches, allowing for gas estimation while preventing premature
 * submission. Outside of simulation, the function should return InvalidNonce}
 * instead.
 */
error FutureNonceDuringSimulation();

/**
 * Selector returned by {IHappyAccount.validate} and
 * {IHappyPaymaster.payout} in simulation mode if the validity of the happyTx
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
 * Selector returned by {IHappyAccount.validte} when the happyTx's signature is invalid.
 */
error InvalidOwnerSignature();

// ====================================================================================================
// EXTENSION KEYS

/**
 * Key used in {HappyTx.extraData} to specify a custom validator address (must satisfy
 * {ICustomBoopValidator}), to be looked up by {IHappyAccount.validate} implementations.
 */
bytes3 constant VALIDATOR_KEY = 0x000001;

/**
 * Key used in {HappyTx.extraData} to specify a custom executor address (must satisfy
 * {ICustomBoopExecutor}), to be looked up by {IHappyAccount.execute} implementations.
 */
bytes3 constant EXECUTOR_KEY = 0x000002;

/**
 * Key used in {HappyTx.extraData} for call information (array of {BatchCallExecutor.Execution}),
 * to be looked up by {BatchCallExecutor.execute}.
 */
bytes3 constant BATCH_CALL_KEY = 0x000100;
