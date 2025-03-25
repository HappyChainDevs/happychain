// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {CallStatus} from "boop/core/HappyEntryPoint.sol";
import {HappyTx} from "boop/core/HappyTx.sol";

/**
 * Execution Output
 * @param status      - Status of the execution (succeeded, failed, call failed, or call reverted)
 * @param revertData  - The associated revert data if the call specified by the happyTx reverts; otherwise, it is empty.
 */
struct ExecutionOutput {
    CallStatus status;
    bytes revertData;
}

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
 *
 * The ERC-165 selector for this interface is 0x2b39e81f and can be obtained via:
 * `console.logBytes4(IHappyAccount.validate.selector ^ IHappyAccount.execute.selector);`
 */
interface IHappyAccount {
    /**
     * Validates a Happy Transaction.
     *
     * This function returns abi.encodeWithSelector(bytes4(0)) if the account validates the happyTx
     * according to its own rules, and an encoded custom error selector otherwise to indicate the
     * reason for rejection.
     *
     * The function should consume a deterministic amount of gas for a given happyTx — more
     * precisely, it is not allowed to consume more gas than it does when simulated via `eth_call`
     * with `tx.origin == 0`.
     *
     * If the validity cannot be ascertained at simulation time (`tx.origin == 0`), then the
     * function should return {UnknownDuringSimulation}. In that case, it should still consume
     * at least as much gas as it would if the validation was successful.
     *
     * This function is called directly by {EntryPoint.submit} and should revert with
     * {NotFromEntryPoint} if not called from an authorized entrypoint.
     *
     * This function is otherwise not allowed to revert. The EntryPoint is able to cope with that
     * scenario, but submitters will mark the account as broken or malicious in that case.
     */
    function validate(HappyTx memory happyTx) external returns (bytes memory);

    /**
     * Executes the call specified by a Happy Transaction.
     *
     * The account is allowed to customize the call, or to perform additional pre and post
     * operations.
     *
     * If the call fails, this function must set {ExecutionOutput.revertData} to the call's revert
     * data.
     *
     * This function is called directly by {EntryPoint.submit} and should revert with
     * {NotFromEntryPoint} if not called from an authorized entrypoint.
     *
     * This function is otherwise not allowed to revert, meaning reverts of the specified call
     * should be caught using ExcessivelySafeCall or similar, and some gas should be reserved to
     * handle the case where the call runs out of gas.
     */
    function execute(HappyTx memory happyTx) external returns (ExecutionOutput memory);

    /**
     * Pays out the given amount (in wei) to the submitter (tx.origin).
     *
     * This function is called directly by {EntryPoint.submit} and should revert with
     * {NotFromEntryPoint} if not called from an authorized entrypoint.
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
     * - {IHappyAccount}: This interface itself (0x2b39e81f)
     * - {IERC165}: Interface detection (0x01ffc9a7)
     * - {IERC1271}: Contract signature validation (0x1626ba7e)
     *
     * Optional interfaces:
     * - {IHappyPaymaster}: For accounts that want to act as their own paymaster (0x24542ca5)
     * - {IExtensibleBoopAccount}: For accounts that want to support extensions (0xf0223481)
     */
    function supportsInterface(bytes4 interfaceID) external view returns (bool);
}
