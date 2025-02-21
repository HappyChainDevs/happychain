// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../core/HappyTx.sol";

/**
 * Execution Output
 * @param gas         - The amount of gas used by the {IHappyAccount.execute} function.
 * @param revertData  - The associated revert data if the call specified by the happyTx reverts; otherwise, it is empty.
 */
struct ExecutionOutput {
    uint256 gas;
    bytes revertData;
}

/**
 * Selector returned from {IHappyAccount.validate} when targeting the wrong account, and
 * optionally from {IHappyPaymaster.payout} (typically when implemented as part of an account).
 */
error WrongAccount();

/**
 * Selector returned when the gas price is too high compared to {HappyTx.maxFeePerGas}.
 */
error GasPriceTooHigh();

/**
 * Selector returned by {IHappyAccount.validate} if the nonce fails to validate.
 * This indicates an invalid nonce that cannot be used now or in the future.
 */
error InvalidNonce();

/**
 * Selector returned by {IHappyAccount.validate} during simulation mode when
 * the nonce is greater than the current nonce but could be valid in the future.
 * This allows the EntryPoint to estimate gas even if the nonce isn't ready yet.
 */
error FutureNonceDuringSimulation();

/**
 * Interface to be implemented by smart contract accounts conforming to the Happy Account standard.
 * Accounts can optionally implement the {IHappyPaymaster} interface if they wish to support
 * paying submitters themselves without relying on external paymasters.
 */
interface IHappyAccount {
    /**
     * Validates a Happy Transaction.
     *
     * This function returns 0 if the account validates the happyTx according
     * to its own rules, and a custom error selector otherwise to indicate
     * the reason for rejection.
     *
     * The function should return {WrongAccount} and
     * {GasPriceTooHigh} if the associated conditions are hit.
     *
     * If the validity cannot be ascertained at simulation time (`tx.origin == 0`),
     * then the function should return {UnknownDuringSimulation}.
     *
     * If the nonce is valid in the future during simulation, the function should return
     * {FutureNonceDuringSimulation}. If both this and the previous paragraph
     * apply, the function should return {UnknownDuringSimulation}.
     *
     * In those two cases, the function should consume at least as much gas as it would
     * if the validation was successful, to allow for accurate gas estimation.
     *
     * The function should consume a deterministic amount of gas for a given happyTx
     * — more precisely, it is not allowed to consume more gas than it does when
     * simulated via `eth_call`.
     *
     * This function is not allowed to revert except from lack of gas (which,
     * if satisfying the condition above, indicates a disfunctional submitter).
     *
     * This function is called directly by {EntryPoint.submit}.
     */
    function validate(HappyTx memory happyTx) external returns (bytes4);

    /**
     * Executes the call specified by a Happy Transaction.
     *
     * The account is allowed to customize the call, or to perform additional
     * pre and post operations.
     *
     * If the call fails, this function must set {ExecutionOutput.revertData}
     * to the call's revert data.
     *
     * Otherwise it sets {ExecutionOutput.gas} to the gas consumed by
     * its entire execution (not only the call), and returns.
     *
     * This function is never allowed to revert if passed enough gas (according to
     * {HappyTx.executeGasLimit}).
     *
     * This function is called directly by {EntryPoint.submit} and should
     * revert with {NotFromEntryPoint} if not called from the entrypoint.
     */
    function execute(HappyTx memory happyTx) external returns (ExecutionOutput memory);

    /**
     * This enables the account to recognize an EOA signature as authoritative in the
     * context of the account, as per per https://eips.ethereum.org/EIPS/eip-1271.
     *
     * This returns the EIP-1271 magic value (0x1626ba7e) iff the provided signature is a valid
     * signature of the provided hash, AND the smart account recognizes the signature as authoritative.
     */
    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4 magicValue);

    /**
     * Returns true iff the contract supports the interface identified by the provided ID,
     * and the provided ID is not 0xffffffff, as per https://eips.ethereum.org/EIPS/eip-165.
     *
     * Required interfaces:
     * - {IHappyAccount}: This interface itself (0x858232cd)
     * - {IERC165}: Interface detection (0x01ffc9a7)
     * - {IERC1271}: Contract signature validation (0x1626ba7e)
     *
     * Optional interfaces:
     * - {IHappyPaymaster}: For accounts that want to act as their own paymaster (0x255406e7)
     */
    function supportsInterface(bytes4 interfaceID) external view returns (bool);
}
