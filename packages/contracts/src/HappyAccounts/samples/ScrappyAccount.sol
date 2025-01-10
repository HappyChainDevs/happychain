// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "oz-upgradeable/access/OwnableUpgradeable.sol";

import {IHappyPaymaster} from "../interfaces/IHappyPaymaster.sol";
import {IHappyAccount, ExecutionOutput, GasPriceTooHigh, WrongAccount} from "../interfaces/IHappyAccount.sol";

import {HappyTx} from "../core/HappyTx.sol";
import {HappyTxLib} from "../libs/HappyTxLib.sol";
import {BasicNonceManager} from "./BasicNonceManager.sol";
import {UnknownDuringSimulation, NotFromEntryPoint} from "../utils/Common.sol";

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

    //* //////////////////////////////////////
    //* Constants ////////////////////////////
    //* //////////////////////////////////////

    bytes4 private constant INTERFACE_ID = 0x01ffc9a7; // ERC-165
    bytes4 private constant MAGIC_VALUE = 0x1626ba7e; // ERC-1271
    uint256 private constant INTRINSIC_GAS = 22_000; // TODO
    uint256 private constant GAS_OVERHEAD_BUFFER = 100; // TODO

    // TODO namespace these fields for easier account upgrades (think on this when turning this into a proxy)
    /// @dev The factory that deployed this proxy
    address private immutable FACTORY;

    /// @dev The deterministic EntryPoint contract
    address private immutable ENTRYPOINT;

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
        if (msg.sender != ENTRYPOINT) revert NotFromEntrypoint();
        _;
    }

    modifier onlyForThisAccount(HappyTx memory happyTx) {
        if (happyTx.account != address(this)) {
            return WrongAccount.selector;
        }
        _;
    }

    //* //////////////////////////////////////
    //* Constructor //////////////////////////
    //* //////////////////////////////////////

    constructor(address _entryPoint, address _owner) {
        _disableInitializers();
    }

    /**
     * @dev Initializer for proxy instances
     *      Called by factory during proxy deployment
     * @param _newOwner The owner who can upgrade the implementation
     */
    function initialize(address _entryPoint, address _owner) external initializer {
        ENTRYPOINT = _entryPoint;
        owner = _owner;
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

    function validate(HappyTx memory happyTx) external onlyForThisAccount(happyTx) returns (bytes4) {
        if (tx.gasprice > happyTx.maxFeePerGas) {
            return GasPriceTooHigh.selector;
        }

        int256 nonceAhead = nonce - int256(_nonce);
        bool isSimulation = tx.origin == address(0); // solhint-disable-line avoid-tx-origin
        if (!_validateAndUpdateNonce(nonceAhead, isSimulation)) {
            return InvalidNonce.selector;
        }

        bytes32 hash;
        if (happyTx.paymaster == address(this)) {
            // self-paying: sign over the gas fields.
            hash = HappyTxLib.getHappyTxHash(happyTx);
        } else {
            // The signer does not sign over these fields to avoid extra network roundtrips
            // validation policy falls to the paymaster or the sponsoring submitter.
            happyTx.gasLimit = 0;
            happyTx.executeGasLimit = 0;
            happyTx.maxFeePerGas = 0;
            happyTx.submitterFee = 0;
            hash = HappyTxLib.getHappyTxHash(happyTx);
        }

        address signer = hash.toEthSignedMessageHash().recover(happyTx.extraData);

        // NOTE: This function may consume slightly more gas during simulation, in accordance to the spec.
        return isSimulation
            ? signer == this.owner
                ? nonceAhead == 0 ? 0 : FutureNonceDuringSimulation.selector
                : UnknownDuringSimulation.selector
            : signer == this.owner ? 0 : InvalidOwnerSignature.selector;
    }

    function execute(HappyTx memory happyTx) external onlyFromEntryPoint returns (ExecutionOutput output) {
        uint256 startGas = gasleft();

        (bool success, bytes memory returnData) = happyTx.dest.call{value: happyTx.value}(happyTx.callData);
        if (!success) {
            output.revertData = returnData;
            return;
        }

        // TODO: get upper limit of gas costs that can't be metered via gasleft()
        // (Solidity gas overhead + gas math and assignment)
        output.gas = startGas - gasLeft() + GAS_OVERHEAD_BUFFER;
    }

    function payout(HappyTx memory happyTx) external onlyFromEntryPoint onlyForThisAccount(happyTx) returns (bytes4) {
        uint256 owed = (consumedGas + INTRINSIC_GAS + GAS_OVERHEAD_BUFFER + HappyTxLib.txGasFromCallGas()) // TODO
            * happyTx.maxFeePerGas + happyTx.submitterFee;

        // solhint-disable-next-line avoid-tx-origin
        payable(tx.origin).call{value: owed}("");
        return 0;
    }

    //* //////////////////////////////////////
    //* Special functions ////////////////////
    //* //////////////////////////////////////

    function isValidSignature(bytes32 hash, bytes memory signature) external pure returns (bytes4) {
        return hash.recover(signature) == owner ? MAGIC_VALUE : 0;
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

    function entryPoint() external view override returns (address) {
        return ENTRYPOINT;
    }

    function factory() external view override returns (address) {
        return FACTORY;
    }

    function getOwner() external view override returns (address) {
        return owner;
    }

    function supportsInterface(bytes4 interfaceId) external view returns (bool) {
        return interfaceId == INTERFACE_ID;
    }
}
