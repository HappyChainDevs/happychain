// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

/// Each of these values is shared between at least two or more of IPaymaster,
/// IAccount, and EntryPoint contracts.

// ====================================================================================================
// ERRORS

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
 * Selector returned by {IAccount.validate} or {ICustomValidator} when a signature is
 * invalid.
 */
error InvalidSignature();
