// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../core/HappyTx.sol";

error WrongTarget();
error SubmitterFeeTooHigh();

/*
 * @title  IHappyPaymaster
 * @dev    Interface for paymasters that can sponsor gas fees for HappyTx transactions.
 *         Each user has a gas budget that refills over time, with a maximum cap.
 */
interface IHappyPaymaster {
    /*
     * This function validates whether the passed happyTx is eligible for sponsorship
     * by this paymaster ("validation"), and if so pays out to the submitter (tx.origin)
     * the submitter tx cost + happyTx.submitterFee.
     *
     * The submitter tx gas usage is the the minimum amount of gas between:
     * (a) consumedGas + the cost of payout's own execution or,
     * (b) happyTx.gasLimit.
     * The gas should be priced according to tx.gasPrice.
     *
     * This is also allowed to conduct extra operations (e.g. swap an ERC20
     * from the user to the gas token).
     *
     * The function must return 0 iff it accepted to sponsor the transaction and
     * successfully paid the submitter. Otherwise it returns the selector of a
     * custom error to indicate the reason for failure.
     *
     * It can also return {@link UnknownDuringSimulation} in simulation mode
     * (tx.origin == 0) to indicate that validity cannot be ascertained during
     * simulation (e.g. we can't verify a signature over the gas limit during
     * simulation, as simulation is used to estimate the gas).
     *
     * If validation fails with {@link UnknownDuringSimulation} during simulation,
     * the function must carry on with the payment, and ensure that as much gas is
     * consume by this function as would be in case of successful validation.
     *
     * The function must revert with {@link NotFromEntryPoint} if not called from
     * the EntryPoint contract (otherwise its funds will be at risk). This function
     * is otherwise not allowed to revert (even if validation fails).
     *
     * The function must NOT revert if the payment fails.
     */
    function payout(HappyTx memory happyTx, uint256 consumedGas) external returns (bytes4);
}
