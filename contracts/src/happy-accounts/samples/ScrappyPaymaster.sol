// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IHappyPaymaster, SubmitterFeeTooHigh} from "../interfaces/IHappyPaymaster.sol";
import {NotFromEntryPoint} from "../utils/Common.sol";
import {HappyTxLib} from "../libs/HappyTxLib.sol";
import {HappyTx} from "../core/HappyTx.sol";

// [LOGGAS_INTERNAL] import {console} from "forge-std/Script.sol";

/**
 * An example paymaster contract implementing the IHappyPaymaster interface.
 * This paymaster sponsors any call, as long as its submitter fee is not too high
 * (computed on the basis of a max gas cost per byte of calldata, configurable at deploy time).
 */
contract ScrappyPaymaster is IHappyPaymaster, ReentrancyGuardTransient, Ownable {
    using ECDSA for bytes32;
    using HappyTxLib for HappyTx;

    // ====================================================================================================
    // CONSTANTS

    /// @dev Fixed size of an encoded HappyTx: 196 bytes for static fields plus 16 bytes (4 bytes × 4) for
    ///      storing the lengths of the four dynamic fields
    uint256 private constant STATIC_FIELDS_SIZE = 212;

    /// @dev Payout function logic cost before payment call
    uint256 private constant PAYOUT_INTRINSIC_GAS_OVERHEAD = 800; // 742 from the gas report

    /// @dev The amount of gas that is added to the payment of the submitter.
    uint256 private constant PAYOUT_PAYMENT_OVERHEAD_GAS = 9500; // 9368 from the gas report

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

    function payout(HappyTx memory happyTx, uint256 consumedGas) external onlyFromEntryPoint returns (bytes4) {
        // [LOGGAS_INTERNAL] uint256 gasOverheadStart = gasleft();

        // forgefmt: disable-next-item
        uint256 totalSize = MAX_TX_SIZE
            + STATIC_FIELDS_SIZE
            + happyTx.callData.length
            + happyTx.validatorData.length
            + happyTx.extraData.length;

        uint256 maxFeePerByte = HappyTxLib.maxCalldataFeePerByte(happyTx);
        uint256 maxSubmitterFee = totalSize * (maxFeePerByte + SUBMITTER_TIP_PER_BYTE);

        if (uint256(happyTx.submitterFee) > maxSubmitterFee) {
            return SubmitterFeeTooHigh.selector;
        }

        int256 _owed = int256(
            (consumedGas + PAYOUT_INTRINSIC_GAS_OVERHEAD + PAYOUT_PAYMENT_OVERHEAD_GAS) * happyTx.maxFeePerGas
        ) + happyTx.submitterFee;
        uint256 owed = _owed > 0 ? uint256(_owed) : 0;

        // [LOGGAS_INTERNAL] uint256 gasPaymentStart = gasleft(); // emulates the cost of the top gasleft call

        // Ignoring the return value of the transfer, as the balances are verified inside the HappyEntryPoint
        (payable(tx.origin).call{value: owed}(""));

        // [LOGGAS_INTERNAL] console.log("PAYOUT_PAYMENT_OVERHEAD_GAS", gasPaymentStart - gasleft());
        // [LOGGAS_INTERNAL] console.log("PAYOUT_INTRINSIC_GAS_OVERHEAD", gasOverheadStart - gasPaymentStart);
        // [LOGGAS_INTERNAL] console.log("payout function gas usage = PAYOUT_PAYMENT_OVERHEAD_GAS + PAYOUT_INTRINSIC_GAS_OVERHEAD");

        return 0;
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
