// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Boop, ExecutionOutput} from "boop/interfaces/Types.sol";

/**
 * Interface to be implemented by smart contract accounts conforming to the Boop Account standard.
 *
 * Accounts should emit the {interfaces/EventsAndErrors.Received} whenever they receive the
 * gas token.
 *
 * The ERC-165 selector for this interface is 0x2eaf0775 and can be obtained via:
 * `console.logBytes4(IAccount.validate.selector ^ IAccount.execute.selector ^ IAccount.payout.selector);`
 */
interface IAccount {
    /**
     * Validates a boop.
     *
     * This function returns abi.encodeWithSelector(bytes4(0)) if the account validates the boop
     * according to its own rules, and an encoded custom error selector otherwise to indicate the
     * reason for rejection.
     *
     * The function should consume a deterministic amount of gas for a given boop — more
     * precisely, it is not allowed to consume more gas than it does when simulated via `eth_call`
     * with `tx.origin == 0`.
     *
     * If the validity cannot be ascertained at simulation time (`tx.origin == 0`), then the
     * function should return {interfaces/EventsAndErrors.UnknownDuringSimulation}. In that case,
     * it should still consume at least as much gas as it would if the validation was successful.
     *
     * This function is called directly by {core/EntryPoint.submit} and should revert with
     * {interfaces/EventsAndErrors.NotFromEntryPoint} if not called from an authorized entrypoint. The
     * account must only accept boops from a single entrypoint, as the entrypoint manages the nonces.
     *
     * This function is otherwise not allowed to revert. The EntryPoint is able to cope with that
     * scenario, but submitters will mark the account as broken or malicious in that case.
     */
    function validate(Boop memory boop) external returns (bytes memory);

    /**
     * Executes the call specified by a boop.
     *
     * The account is allowed to customize the call, or to perform additional pre and post
     * operations.
     *
     * The function should set {interfaces/Types.ExecutionOutput}.status to the status of the
     * call: succeeded, reverted, or rejected. Rejection indicates that the account itself
     * could not process call, typically because the input (e.g. the extraData) is malformed.
     *
     * If the call reverts, this function must set {interfaces/Types.ExecutionOutput}.revertData
     * to the call's revert data.
     *
     * If the account rejects, it should set the revertData to an encoded error that explains
     * the reason for rejection. The error {interfaces/EventsAndErrors.InvalidExtensionValue}
     * is standard to indicate invalid extensions specified in the extraData.
     *
     * This function is called directly by {core/EntryPoint.submit} and should revert with
     * {interfaces/EventsAndErrors.NotFromEntryPoint} if not called from an authorized entrypoint.
     *
     * This function is otherwise not allowed to revert, meaning reverts of the specified call
     * should be caught using ExcessivelySafeCall or similar, and some gas should be reserved to
     * handle the case where the call runs out of gas.
     */
    function execute(Boop memory boop) external returns (ExecutionOutput memory);

    /**
     * Pays out the given amount (in wei) to the submitter (tx.origin).
     *
     * This function is called directly by {core/EntryPoint.submit} and should revert with
     * {interfaces/EventsAndErrors.NotFromEntryPoint} if not called from an authorized entrypoint.
     *
     * This function should simply be implemented as: `payable(tx.origin).call{value: amount}("");`
     * This is important as the entrypoint will rely on the estimated gas cost of this call to
     * validate the payment, which could otherwise lead to the boop reverting.
     * There is no need to validate the status of the payment — the EntryPoint will do so.
     *
     * Validations pertaining to self-payment should be made in {validate}.
     */
    function payout(uint256 amount) external;

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
     * - {IAccount}: This interface itself (0xa1c9a6b3)
     * - {IERC165}: Interface detection (0x01ffc9a7)
     * - {IERC1271}: Contract signature validation (0x1626ba7e)
     *
     * Optional interfaces:
     * - {IExtensibleAccount}: For accounts that want to support extensions (0xf0223481)
     */
    function supportsInterface(bytes4 interfaceID) external view returns (bool);
}
