// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "oz-upgradeable/access/OwnableUpgradeable.sol";

import {IHappyPaymaster} from "../interfaces/IHappyPaymaster.sol";
import {
    IHappyAccount,
    ExecutionOutput,
    GasPriceTooHigh,
    InvalidNonce,
    WrongAccount
} from "../interfaces/IHappyAccount.sol";

import {HappyTx} from "../core/HappyTx.sol";
import {HappyTxLib} from "../libs/HappyTxLib.sol";
import {BasicNonceManager} from "./BasicNonceManager.sol";
import {
    FutureNonceDuringSimulation,
    InvalidOwnerSignature,
    NotFromEntryPoint,
    UnknownDuringSimulation
} from "../utils/Common.sol";

// [LOGGAS] import {console} from "forge-std/Script.sol";

/**
 * @title  ScrappyAccount
 * @dev    Example implementation of a Happy Account with nonce management, reentrancy protection,
 *         and proxy upgrade capability.
 */
contract ScrappyAccount is
    IHappyAccount,
    IHappyPaymaster,
    BasicNonceManager,
    ReentrancyGuardTransient,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    using ECDSA for bytes32;
    using HappyTxLib for HappyTx;
    using MessageHashUtils for bytes32;

    //* //////////////////////////////////////
    //* Constants ////////////////////////////
    //* //////////////////////////////////////

    bytes4 private constant INTERFACE_ID = 0x01ffc9a7; // ERC-165
    bytes4 private constant MAGIC_VALUE = 0x1626ba7e; // ERC-1271
    uint256 private constant INTRINSIC_GAS = 22_000; // TODO
    uint256 private constant GAS_OVERHEAD_BUFFER = 12345; // TODO

    /// @dev The deterministic EntryPoint contract
    address private immutable ENTRYPOINT;

    /// @dev The factory that deployed this proxy
    address private _factory;

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
        if (msg.sender != ENTRYPOINT) revert NotFromEntryPoint();
        _;
    }

    //* //////////////////////////////////////
    //* Constructor //////////////////////////
    //* //////////////////////////////////////

    constructor(address _entrypoint) {
        ENTRYPOINT = _entrypoint;
        _disableInitializers();
    }

    /**
     * @dev Initializer for proxy instances
     *      Called by factory during proxy deployment
     * @param _owner The owner who can upgrade the implementation
     */
    function initialize(address _owner) external initializer {
        _factory = msg.sender;
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

    function validate(HappyTx memory happyTx) external returns (bytes4) {
        if (happyTx.account != address(this)) {
            return WrongAccount.selector;
        }

        if (tx.gasprice > happyTx.maxFeePerGas) {
            return GasPriceTooHigh.selector;
        }

        uint256 nonce = (happyTx.nonceTrack << 192) | happyTx.nonceValue;
        int256 nonceAhead = int256(nonce) - int256(_nonce);
        bool isSimulation = tx.origin == address(0);
        if (!_validateAndUpdateNonce(nonceAhead, isSimulation)) {
            return InvalidNonce.selector;
        }

        if (happyTx.paymaster != address(this)) {
            // The happyTx is not self-paying
            // The signer does not sign over these fields to avoid extra network roundtrips
            // validation policy falls to the paymaster or the sponsoring submitter.
            happyTx.gasLimit = 0;
            happyTx.executeGasLimit = 0;
            happyTx.maxFeePerGas = 0;
            happyTx.submitterFee = 0;
        } // Else, self-paying txn

        address signer = happyTx.getHappyTxHash().toEthSignedMessageHash().recover(happyTx.extraData);

        // NOTE: This function may consume slightly more gas during simulation, in accordance to the spec.
        return isSimulation
            ? signer == owner()
                ? nonceAhead == 0 ? bytes4(0) : FutureNonceDuringSimulation.selector
                : UnknownDuringSimulation.selector
            : signer == owner() ? bytes4(0) : InvalidOwnerSignature.selector;
    }

    function execute(HappyTx memory happyTx) external onlyFromEntryPoint returns (ExecutionOutput memory output) {
        uint256 startGas = gasleft();

        (bool success, bytes memory returnData) = happyTx.dest.call{value: happyTx.value}(happyTx.callData);
        if (!success) {
            output.revertData = returnData;
            return output;
        }

        // TODO: get upper limit of gas costs that can't be metered via gasleft()
        // (Solidity gas overhead + gas math and assignment)
        output.gas = startGas - gasleft() + GAS_OVERHEAD_BUFFER;
    }

    function payout(HappyTx memory happyTx, uint256 consumedGas) external onlyFromEntryPoint returns (bytes4) {
        // [LOGGAS] uint256 initialGas = gasleft();

        if (happyTx.account != address(this)) {
            return WrongAccount.selector;
        }

        uint256 owed = (consumedGas + INTRINSIC_GAS + GAS_OVERHEAD_BUFFER) // TODO
            * happyTx.maxFeePerGas + uint256(happyTx.submitterFee);

        payable(tx.origin).call{value: owed}("");

        // [LOGGAS] uint256 finalGas = gasleft();

        // [LOGGAS] console.log("Gas used in payout:", initialGas - finalGas);
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

    //* //////////////////////////////////////
    //* View functions ///////////////////////
    //* //////////////////////////////////////

    function entryPoint() external view returns (address) {
        return ENTRYPOINT;
    }

    function factory() external view override returns (address) {
        return _factory;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == INTERFACE_ID;
    }
}
