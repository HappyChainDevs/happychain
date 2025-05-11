// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Boop} from "boop/interfaces/Types.sol";

/**
 * Selector returned from {interfaces/IPaymaster.validatePayment} when the boop's fee exceeds
 * what the paymaster will accept.
 */
error SubmitterFeeTooHigh();

/**
 * Interface for paymasters that can sponsor gas fees for boop transactions.
 *
 * Paymasters should emit the {interfaces/EventsAndErrors.Received} whenever they receive the
 * gas token, but should not otherwise write custom receive logic (or at least no such function that
 * consumes more than 2300 gas), as that screws up the entry point's gas accounting and will cause
 * the paymaster to revert if it consumes more than the 2300 gas allowance.
 *
 * Implementers of this interface must implement functionality that enables managing the stake
 * with the {core/EntryPoint}, by calling the functions implemented in {core/Staking}. The paymaster
 * itself is the only one authorized to change withdraw delays, initiate and finalize withdrawals.
 *
 * The ERC-165 selector for this interface is 0x8034b4ab and can be obtained via:
 * `console.logBytes4(IPaymaster.validatePayment.selector);`
 */
interface IPaymaster {
    /**
     * This function validates whether the passed boop is eligible for sponsorship by this
     * paymaster.
     *
     * The function must return `abi.encodeWithSelector(bytes4(0))` iff it accepted to sponsor the
     * transaction. Otherwise it returns the result of `abi.encodeWithSelector` with a custom error
     * to indicate the reason for rejection.
     *
     * It can use {interfaces/EventsAndErrors.UnknownDuringSimulation} as a returned error in simulation mode
     * (tx.origin == 0) to indicate that validity cannot be ascertained during simulation (e.g. we can't verify a
     * signature over the gas limit during simulation, as simulation is used to estimate the gas).
     *
     * If validation fails with {interfaces/EventsAndErrors.UnknownDuringSimulation} during simulation,
     * the function must ensure that as much gas is consumed by this function as would be in case of
     * successful validation.
     *
     * The function must revert with {interfaces/EventsAndErrors.NotFromEntryPoint} if not called from
     * {core/EntryPoint} (otherwise its funds will be at risk), and should not otherwise revert. If
     * validation fails, it should return instead, as per the above.
     */
    function validatePayment(Boop memory boop) external returns (bytes memory);
}
