// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "oz-upgradeable/access/OwnableUpgradeable.sol";

import {IHappyPaymaster, SubmitterFeeTooHigh, WrongTarget} from "../interfaces/IHappyPaymaster.sol";
import {NotFromEntryPoint} from "../utils/Common.sol";
import {HappyTx} from "../core/HappyTx.sol";

/**
 * @title ScrappyPaymaster
 * @notice An example paymaster contract implementing the IHappyPaymaster interface.
 */
contract ScrappyPaymaster is IHappyPaymaster, ReentrancyGuardTransient, OwnableUpgradeable, UUPSUpgradeable {
    using ECDSA for bytes32;

    // ====================================================================================================
    // CONSTANTS

    /// @dev Fixed size of an encoded HappyTx: 196 bytes for static fields plus 16 bytes (4 bytes × 4) for storing
    ///      the lengths of the four dynamic fields
    uint256 private constant STATIC_FIELDS_SIZE = 212;

    /// @dev The fixed gas cost of payout() function + call overhead
    uint256 private constant PAYOUT_CALL_OVERHEAD = 1234; // TODO

    /// @dev 280 is the max size of a tx with empty calldata with an empty access list.
    ///      Given RLP encoding, this should be significantly less.
    uint256 private constant MAX_TX_SIZE = 280; // TODO

    /// @dev This paymaster refuses to pay more to the submitter than this amount of wei per byte
    ///      of data in the submitter tx. Set once during initialization.
    uint256 public maxSubmitterFeePerByte;

    /// @dev This paymaster sponsors all calls to this target contract.
    ///      Set once during initialization and cannot be changed afterwards.
    address public target;

    /// @dev The deterministic EntryPoint contract
    address public entryPoint;

    // ====================================================================================================
    // EVENTS

    /// @notice Emitted when the contract implementation is upgraded to a new implementation
    event Upgraded(address indexed newImplementation);

    /// @notice Emitted when ETH is received by the contract
    event Received(address sender, uint256 amount);

    // ====================================================================================================
    // MODIFIERS

    /// @dev Checks if the the call was made from the EntryPoint contract
    modifier onlyFromEntryPoint() {
        if (msg.sender != entryPoint) revert NotFromEntryPoint();
        _;
    }

    // ====================================================================================================
    // CONSTRUCTOR

    constructor() {
        _disableInitializers();
    }

    /**
     * @dev   Initializer for proxy instances.
     * @param _entryPoint The deterministic EntryPoint contract
     * @param _target The target contract that will be sponsored
     * @param _maxSubmitterFeePerByte The maximum fee per byte that the submitter is willing to pay
     * @param _owner The owner who can upgrade the implementation
     */
    function initialize(address _entryPoint, address _target, uint256 _maxSubmitterFeePerByte, address _owner)
        external
        initializer
    {
        entryPoint = _entryPoint;
        target = _target;
        maxSubmitterFeePerByte = _maxSubmitterFeePerByte;
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
    }

    /**
     * @notice Function that authorizes an upgrade of this contract via the UUPS proxy pattern
     * @param newImplementation The address of the new implementation contract
     * @dev Only callable by the owner
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ====================================================================================================
    // EXTERNAL FUNCTIONS

    function payout(HappyTx memory happyTx, uint256 consumedGas) external onlyFromEntryPoint returns (bytes4) {
        if (happyTx.dest != target) {
            return WrongTarget.selector;
        }

        uint256 maxSubmitterFee = (
            MAX_TX_SIZE + STATIC_FIELDS_SIZE + happyTx.callData.length + happyTx.validatorData.length
                + happyTx.extraData.length
        ) * maxSubmitterFeePerByte;

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
