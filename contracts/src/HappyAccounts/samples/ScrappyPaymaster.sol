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

    //* //////////////////////////////////////
    //* Constants ////////////////////////////
    //* //////////////////////////////////////

    /// @dev ERC-1271
    bytes4 private constant MAGIC_VALUE = 0x1626ba7e;

    /// @dev TODO is the fixed siz of the MUD-encoded happyTx
    uint256 private constant TODO_VAR_1 = 224; // TODO Finalize

    /// @dev TODO is the gas cost of this function + call overhead
    uint256 private constant TODO_VAR_2 = 1234; // TODO Finalize

    /// @dev 280 is the max size of a tx with empty calldata with an empty access list.
    ///      Given RLP encoding, this should be significantly less.
    uint256 private constant MAX_TX_SIZE = 100; // TODO

    /// @dev This spaymaster sponsors all calls to this contract.
    address private immutable TARGET;

    /// @dev This paymaster refuses to pay more to the submitter than this amount of wei per byte
    ///      of data in the submitter tx.
    uint256 private immutable MAX_SUBMITTER_FEE_PER_BYTE;

    // TODO namespace these fields for easier account upgrades (think on this when turning this into a proxy)
    /// @dev The deterministic EntryPoint contract
    address public entryPoint;

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;

    //* //////////////////////////////////////
    //* Events ///////////////////////////////
    //* //////////////////////////////////////

    event Upgraded(address indexed implementation);
    event Received(address sender, uint256 amount);

    //* //////////////////////////////////////
    //* Errors ///////////////////////////////
    //* //////////////////////////////////////

    error NotFromAccount();

    //* //////////////////////////////////////
    //* Modifiers ////////////////////////////
    //* //////////////////////////////////////

    /// @dev Checks if the the call was made from the EntryPoint contract
    modifier onlyFromEntryPoint() {
        if (msg.sender != entryPoint) revert NotFromEntryPoint();
        _;
    }

    //* //////////////////////////////////////
    //* Constructor //////////////////////////
    //* //////////////////////////////////////
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializer for proxy instances
     *      Called by factory during proxy deployment
     * @param _owner The owner who can upgrade the implementation
     */
    function initialize(address _entryPoint, address _owner) external initializer {
        entryPoint = _entryPoint;
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
    }

    /// @notice Function that authorizes an upgrade of this contract via the UUPS proxy pattern
    /// @param newImplementation The address of the new implementation contract
    /// @dev Only callable by the owner
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    //* //////////////////////////////////////
    //* External functions ///////////////////
    //* //////////////////////////////////////

    function payout(HappyTx memory happyTx, uint256 consumedGas) external onlyFromEntryPoint returns (bytes4) {
        if (happyTx.dest != TARGET) {
            return WrongTarget.selector;
        }

        uint256 maxSubmitterFee = (
            MAX_TX_SIZE + TODO_VAR_1 + happyTx.callData.length + happyTx.validatorData.length + happyTx.extraData.length
        ) * MAX_SUBMITTER_FEE_PER_BYTE;

        if (uint256(happyTx.submitterFee) > maxSubmitterFee) {
            return SubmitterFeeTooHigh.selector;
        }

        uint256 owed = (consumedGas + TODO_VAR_2) * happyTx.maxFeePerGas + uint256(happyTx.submitterFee);

        // solhint-disable-next-line avoid-tx-origin
        payable(tx.origin).call{value: owed}("");
        return 0;
    }

    //* //////////////////////////////////////
    //* Special functions ////////////////////
    //* //////////////////////////////////////

    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4) {
        return hash.recover(signature) == owner() ? MAGIC_VALUE : bytes4(0);
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    fallback() external payable {
        emit Received(msg.sender, msg.value);
    }
}
