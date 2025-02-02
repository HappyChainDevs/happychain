// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

/*
 * Selector returned by {@link IHappyAccount.validate} in simulation mode if the
 * nonce can be valid in the future but is not the current nonce (and so the happyTx
 * would fail if submitted before the ones matching missing nonces).
 * 
 * This error is used during simulation to indicate that a transaction will be valid
 * once its nonce matches, allowing for gas estimation while preventing premature
 * submission. Outside of simulation, the function should return {@link InvalidNonce}
 * instead.
 */
error FutureNonceDuringSimulation();

/*
 * Selector returned by {@link IHappyAccount.validate} and
 * {@link IHappyPaymaster.payout} in simulation mode if the validity of the happyTx
 * cannot be ascertained during simulation.
 *
 * e.g. we can't verify a signature over the gas limit during simulation,
 * as simulation is used to estimate the gas.
 */
error UnknownDuringSimulation();

/*
 * Functions that are supposed to be called from the EntryPoint contract but are not
 * should *revert* with this error.
 */
error NotFromEntryPoint();

/*
 * Selector returned by {@link IHappyAccount.validte} when the happyTx's signature is invalid.
 */
error InvalidOwnerSignature();
