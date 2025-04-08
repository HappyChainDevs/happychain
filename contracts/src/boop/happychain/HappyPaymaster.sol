// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {EntryPoint} from "boop/core/EntryPoint.sol";
import {IPaymaster, SubmitterFeeTooHigh} from "boop/interfaces/IPaymaster.sol";

import {Utils} from "boop/libs/Utils.sol";
import {Encoding} from "boop/libs/Encoding.sol";
import {Boop} from "boop/interfaces/Types.sol";
import {NotFromEntryPoint} from "boop/interfaces/EventsAndErrors.sol";

/**
 * An example paymaster contract implementing the IPaymaster interface.
 * This paymaster sponsors any call, as long as its submitter fee is not too high
 * (computed on the basis of a max gas cost per byte of calldata, configurable at deploy time).
 */
contract HappyPaymaster is IPaymaster, ReentrancyGuardTransient, Ownable {
    using ECDSA for bytes32;
    using Encoding for Boop;

    // ====================================================================================================
    // CONSTANTS

    /// @dev Fixed size of an encoded Boop: 220 bytes for static fields plus 16 bytes (4 bytes × 4) for
    ///      storing the lengths of the four dynamic fields
    uint256 private constant STATIC_FIELDS_SIZE = 220;

    /// @dev The amount of gas consumed by the payout function.
    uint256 private constant PAYOUT_GAS = 12_000; // measured: 10097 + safety margin

    /// @dev The max size of a tx with empty calldata with an empty access list.
    ///      Given RLP encoding, this should usually be significantly less.
    uint256 private constant MAX_TX_SIZE = 280;

    /// The allowed EntryPoint contract
    address public immutable ENTRYPOINT;

    /// This paymaster refuses to pay more to the submitter than this amount of wei per byte of data.
    uint256 public immutable SUBMITTER_TIP_PER_BYTE;

    // ====================================================================================================
    // EVENTS

    /// Emitted when ETH is received by the contract
    event Received(address indexed sender, uint256 amount);

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
     * @param submitterTipPerByte The maximum fee per byte that the submitter is willing to pay
     */
    constructor(address entryPoint, uint256 submitterTipPerByte, address owner) Ownable(owner) {
        ENTRYPOINT = entryPoint;
        SUBMITTER_TIP_PER_BYTE = submitterTipPerByte;
    }

    // ====================================================================================================
    // EXTERNAL FUNCTIONS

    /**
     * This function validates that the submitter fee is reasonably priced, but otherwise accepts
     * to pay for any boop.
     */
    function validatePayment(Boop memory boop) external view onlyFromEntryPoint returns (bytes memory) {
        // forgefmt: disable-next-item
        uint256 totalSize = MAX_TX_SIZE
            + STATIC_FIELDS_SIZE
            + boop.callData.length
            + boop.validatorData.length
            + boop.extraData.length;

        // Only validate positive submitter fees
        if (boop.submitterFee > 0) {
            uint256 maxFeePerByte = Utils.maxCalldataFeePerByte(boop);
            uint256 maxSubmitterFee = totalSize * (maxFeePerByte + SUBMITTER_TIP_PER_BYTE);

            if (uint256(boop.submitterFee) > maxSubmitterFee) {
                return abi.encodeWithSelector(SubmitterFeeTooHigh.selector);
            }
        }

        return abi.encodeWithSelector(bytes4(0));
    }

    // ====================================================================================================
    // STAKE MANAGEMENT

    /**
     * Adds the value to the paymaster's stake. cf. {Staking.deposit}
     */
    function deposit() external payable {
        EntryPoint(ENTRYPOINT).deposit{value: msg.value}(address(this));
    }

    /**
     * cf. {Staking.updateWithdrawalDelay}
     */
    function updateWithdrawalDelay(uint64 withdrawDelay) external onlyOwner {
        EntryPoint(ENTRYPOINT).updateWithdrawDelay(withdrawDelay);
    }

    /**
     * Equivalent to {updateWithdrawalDelay} followed by {deposit}.
     */
    function depositWithDelay(uint64 withdrawDelay) external payable onlyOwner {
        EntryPoint(ENTRYPOINT).updateWithdrawDelay(withdrawDelay);
        EntryPoint(ENTRYPOINT).deposit{value: msg.value}(address(this));
    }

    /**
     * cf. {Staking.initiateWithdrawal}
     */
    function initiateWithdrawal(uint128 amount) external onlyOwner {
        EntryPoint(ENTRYPOINT).initiateWithdrawal(amount);
    }

    /**
     * cf. {Staking.withdraw}
     */
    function withdraw(uint128 amount, address payable destination) external onlyOwner {
        EntryPoint(ENTRYPOINT).withdraw(amount, destination);
    }

    // ====================================================================================================
    // SPECIAL FUNCTIONS

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    /// Allows the owner to withdraw a specified amount of funds from the paymaster, reverting if failing to transfer.
    function withdraw(address to, uint256 amount) external onlyOwner {
        if (amount > address(this).balance) revert("Insufficient balance");
        (bool success,) = payable(to).call{value: amount}("");
        require(success, "Failed to withdraw funds");
    }
}
