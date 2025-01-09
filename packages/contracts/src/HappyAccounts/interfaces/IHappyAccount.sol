// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../HappyTx.sol";

/*
 * Execution Output struct
 * @param gas         - The amount of gas used by the {@link execute} function.
 * @param revertData  - The associated revert data if the call specified by the happyTx reverts; otherwise, it is empty.
 */
struct ExecutionOutput {
    bytes32 gas;
    bytes revertData;
}

/*
 * @dev Selector returned from {@link IHappyAccount.validate} when targeting the wrong account, and
 *      optionally from {@link IHappyPaymaster.payout} (typically when implemented as part of an account).
 */
error WrongAccount();

/*
 * @dev Selector returned when the gas price is too high compared to {@link HappyTx.maxFeePerGas}.
 */
error GasPriceTooHigh();

/*
 * @dev Selector returned by {@link IHappyAccount.validate} if the nonce fails to validate.
 * 
 *      In simulation mode, that call should return {@link FutureNonceDuringSimulation} if
 *      the nonce can be valid in the future instead.
 */
error InvalidNonce();

/*
 * @title IHappyAccount
 * @dev   Interface to be implemented by smart contract accounts conforming to the Happy Account standard.
 * 
 *        Accounts can optionally implement the {@link IHappyPaymaster} interface if they wish to support
 *        paying submitters themselves without relying on external paymasters.
 */
interface IHappyAccount {
    /*
     * Returns the address of the factory that deployed this account.
     * Or addres(0), if this account was not deployed from a factory.
     */
    function factory() external view returns (address);

    /*
     * Validates a Happy Transaction.
     *
     * This function returns 0 if the account validates the happyTx according
     * to its own rules, and a custom error selector otherwise to indicate
     * the reason for rejection.
     *
     * The function should return {@link WrongAccount} and
     * {@link GasPriceTooHigh} if the associated conditions are hit.
     *
     * If the validity cannot be ascertained at simulation time (`tx.origin == 0`),
     * then the function should return {@link UnknownDuringSimulation}.
     * 
     * If the nonce is valid in the future during simulation, the function should return
     * {@link FutureNonceDuringSimulation}. If both this and the previous paragraph
     * apply, the function should return {@link UnknnownDuringSimulation}.
     *
     * In those two cases, the function should consume at least as much gas as it would
     * if the validation was successful, to allow for accurate gas estimation.
     *
     * The function should consume a deterministic amount of gas for a given happyTx
     * -— more precisely, it is not allowed to consume more gas than it does when
     * simulated via `eth_call`.
     *
     * This function is not allowed to revert except from lack of gas (which,
     * if satisfying the condition above, indicates a disfunctional submitter).
     *
     * This function is called directly by {@link EntryPoint.submit}.
     */
    function validate(HappyTx memory happyTx) external returns (bytes4);

    /*
     * Executes the call specified by a Happy Transaction.
     *
     * The account is allowed to customize the call, or to perform additional
     * pre and post operations.
     *
     * If the call fails, this function must set {@link ExecutionOutput.revertData}
     * to the call's revert data.
     *
     * Otherwise it sets {@link ExecutionOutput.gas} to the gas consumed by
     * its entire execution (not only the call), and returns.
     *
     * This function is never allowed to revert if passed enough gas (according to
     * {@link HappyTx.executeGasLimit}).
     *
     * This function is called directly by {@link EntryPoint.submit} and should
     * revert with {@link NotFromEntryPoint} if not called from the entrypoint.
     */
    function execute(HappyTx memory happyTx) external returns (ExecutionOutput memory);

    /*
     * This enables the account to recognize the EOA signatures as authoritative in the
     * context of the account, as per per https://eips.ethereum.org/EIPS/eip-1271.
     *
     * This returns the EIP-1271 magic value (0x1626ba7e) iff the provided signature is a valid
     * signature of the provided hash, AND the smart account recognizes the signature as authoritative.
     */
    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4 magicValue);

    /*
     * Returns true iff the contract supports the interface identified by the provided ID,
     * and the provided ID if not 0xffffffff, as per https://eips.ethereum.org/EIPS/eip-165.
     */
    function supportsInterface(bytes4 interfaceID) external view returns (bool);
}
