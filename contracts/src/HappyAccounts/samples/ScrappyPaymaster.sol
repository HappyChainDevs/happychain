// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

import {IHappyPaymaster, SubmitterFeeTooHigh, WrongTarget} from "../interfaces/IHappyPaymaster.sol";
import {NotFromEntryPoint} from "../utils/Common.sol";
import {HappyTx} from "../core/HappyTx.sol";

/**
 * @title ScrappyPaymaster
 * @notice An example paymaster contract implementing the IHappyPaymaster interface.
 */
contract ScrappyPaymaster is IHappyPaymaster, ReentrancyGuardTransient, Ownable {
    using ECDSA for bytes32;

    // ====================================================================================================
    // CONSTANTS

    /// @dev Fixed size of an encoded HappyTx: 196 bytes for static fields plus 16 bytes (4 bytes × 4) for
    ///      storing the lengths of the four dynamic fields
    uint256 private constant STATIC_FIELDS_SIZE = 212;

    /// @dev The fixed gas cost of payout() function + call overhead
    uint256 private constant PAYOUT_CALL_OVERHEAD = 1234; // TODO

    /// @dev 280 is the max size of a tx with empty calldata with an empty access list.
    ///      Given RLP encoding, this should be significantly less.
    uint256 private constant MAX_TX_SIZE = 280; // TODO

    /// @dev The deterministic EntryPoint contract
    address public immutable ENTRYPOINT;

    /// @dev This paymaster sponsors all calls to this target contract.
    address public immutable TARGET;

    /// @dev This paymaster refuses to pay more to the submitter than this amount of wei per byte of data.
    uint256 public immutable MAX_SUBMITTER_FEE_PER_BYTE;

    // ====================================================================================================
    // EVENTS

    /// @notice Emitted when ETH is received by the contract
    event Received(address sender, uint256 amount);

    // ====================================================================================================
    // MODIFIERS

    /// @dev Checks if the the call was made from the EntryPoint contract
    modifier onlyFromEntryPoint() {
        if (msg.sender != ENTRYPOINT) revert NotFromEntryPoint();
        _;
    }

    // ====================================================================================================
    // CONSTRUCTOR

    /**
     * @param entryPoint The deterministic EntryPoint contract
     * @param target The target contract that will be sponsored
     * @param maxSubmitterFeePerByte The maximum fee per byte that the submitter is willing to pay
     */
    constructor(address entryPoint, address target, uint256 maxSubmitterFeePerByte, address owner) Ownable(owner) {
        ENTRYPOINT = entryPoint;
        TARGET = target;
        MAX_SUBMITTER_FEE_PER_BYTE = maxSubmitterFeePerByte;
    }

    // ====================================================================================================
    // EXTERNAL FUNCTIONS

    function payout(HappyTx memory happyTx, uint256 consumedGas) external onlyFromEntryPoint returns (bytes4) {
        if (happyTx.dest != TARGET) {
            return WrongTarget.selector;
        }

        uint256 maxSubmitterFee = (
            MAX_TX_SIZE + STATIC_FIELDS_SIZE + happyTx.callData.length + happyTx.validatorData.length
                + happyTx.extraData.length
        ) * MAX_SUBMITTER_FEE_PER_BYTE;

        if (uint256(happyTx.submitterFee) > maxSubmitterFee) {
            return SubmitterFeeTooHigh.selector;
        }

        uint256 owed = (consumedGas + PAYOUT_CALL_OVERHEAD) * happyTx.maxFeePerGas + uint256(happyTx.submitterFee);

        payable(tx.origin).call{value: owed}("");
        return 0;
    }

    // ====================================================================================================
    // SPECIAL FUNCTIONS

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    // ====================================================================================================
    // ADMIN FUNCTIONS

    /**
     * @notice Allows the owner to withdraw a specified amount of funds from the paymaster
     * @dev    Only callable by the owner. Reverts if amount exceeds contract balance
     */
    function withdraw(address to, uint256 amount) external onlyOwner {
        if (amount > address(this).balance) revert("Insufficient balance");
        (bool success,) = payable(to).call{value: amount}("");
        require(success, "Failed to withdraw funds");
    }
}
