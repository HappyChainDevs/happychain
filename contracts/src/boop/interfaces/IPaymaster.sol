// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Boop} from "boop/interfaces/Types.sol";

/**
 * Selector returned from {IPaymaster.payout} when the paymaster's fee exceeds
 * the maximum allowed.
 */
error SubmitterFeeTooHigh();

/**
 * Interface for paymasters that can sponsor gas fees for boop transactions.
 *
 * Implementers of this interface should not write custom `receive` functions (or at least no such
 * function that consumes more than 2300 gas), as that screws up the entry point's gas accounting
 * and will cause the paymaster to revert if it consumes more than the 2300 gas allowance.
 *
 * Implementers of this interface must implement functionality that enables managing the stake
 * with the {EntryPoint}, by calling the functions implemented in `Staking.sol`. The paymaster
 * itself is the only one authorized to change withdraw delays, initiate and finalize withdrawals.
 *
 * The ERC-165 selector for this interface is 0x24542ca5 and can be obtained via:
 * `console.logBytes4(IPaymaster.payout.selector);`
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
     * It can use {UnknownDuringSimulation} as a returned error in simulation mode (tx.origin == 0)
     * to indicate that validity cannot be ascertained during simulation (e.g. we can't verify a
     * signature over the gas limit during simulation, as simulation is used to estimate the gas).
     *
     * If validation fails with {UnknownDuringSimulation} during simulation, the function must
     * ensure that as much gas is consume by this function as would be in case of successful
     * validation.
     *
     * The function must revert with {NotFromEntryPoint} if not called from the EntryPoint contract
     * (otherwise its funds will be at risk), and should not otherwise revert. If validation fails
     * it should return instead, as per the above.
     */
    function validatePayment(Boop memory boop) external returns (bytes memory);
}
