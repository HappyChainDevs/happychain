// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ECDSA} from "solady/utils/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "oz-upgradeable/access/OwnableUpgradeable.sol";

import {ICustomBoopValidator} from "../../interfaces/extensions/ICustomBoopValidator.sol";
import {GasPriceTooHigh, InvalidNonce} from "../../interfaces/IHappyAccount.sol";

import {HappyTx} from "../../core/HappyTx.sol";
import {HappyTxLib} from "../../libs/HappyTxLib.sol";
import {FutureNonceDuringSimulation, InvalidOwnerSignature, UnknownDuringSimulation} from "../../utils/Common.sol";

struct SessionKeyValidatorStorage {
    address sessionKey;
}

contract SessionKeyValidator is ICustomBoopValidator, ReentrancyGuardTransient, OwnableUpgradeable, UUPSUpgradeable {
    using ECDSA for bytes32;
    using HappyTxLib for HappyTx;
    using MessageHashUtils for bytes32;

    // ====================================================================================================
    // EVENTS

    /// Emitted when a session key is added
    event SessionKeyAdded(address indexed account, address indexed targetContract, address sessionKey);

    /// Emitted when a session key is removed
    event SessionKeyRemoved(address indexed account, address indexed targetContract);

    /// Emitted when ETH is received by the contract
    event Received(address indexed sender, uint256 amount);

    // ====================================================================================================
    // CONSTANTS

    /// @dev ERC-1271 selector
    bytes4 private constant MAGIC_VALUE = 0x1626ba7e;

    // ====================================================================================================
    // IMMUTABLES AND STATE VARIABLES

    /// keccak256(account, targetContract) => SessionKeyValidatorStorage
    mapping(bytes32 => SessionKeyValidatorStorage) public sessionKeyValidatorStorage;

    /// Mapping from track => nonce
    mapping(uint192 => uint64) public nonceValue;

    // ====================================================================================================
    // CONSTRUCTOR

    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
    }

    // ====================================================================================================
    // EXTERNAL FUNCTIONS

    function addSessionKeys(address[] calldata targetContract, address[] calldata sessionKey) external {
        for (uint256 i = 0; i < targetContract.length; i++) {
            _addSessionKey(msg.sender, targetContract[i], sessionKey[i]);
        }
    }

    function removeSessionKeys(address[] calldata targetContract) external {
        for (uint256 i = 0; i < targetContract.length; i++) {
            _removeSessionKey(msg.sender, targetContract[i]);
        }
    }

    function getStorageKey(address account, bytes20 target) external pure returns (bytes32) {
        return _getStorageKey(account, target);
    }

    function validate(HappyTx memory happyTx) external returns (bytes4) {
        address sessionKey = sessionKeyValidatorStorage[_getStorageKey(msg.sender, bytes20(happyTx.dest))].sessionKey;

        if (tx.gasprice > happyTx.maxFeePerGas) {
            return GasPriceTooHigh.selector;
        }

        bool isSimulation = tx.origin == address(0);
        uint256 happyTxNonce = (happyTx.nonceTrack << 192) | happyTx.nonceValue;
        uint256 currentNonce = getNonce(happyTx.nonceTrack);
        int256 nonceAhead = int256(happyTxNonce) - int256(currentNonce);

        if (nonceAhead < 0 || (!isSimulation && nonceAhead != 0)) return InvalidNonce.selector;
        nonceValue[happyTx.nonceTrack]++;

        if (happyTx.paymaster != happyTx.account) {
            // The happyTx is not self-paying.
            // The signer does not sign over these fields to avoid extra network roundtrips
            // validation policy falls to the paymaster or the sponsoring submitter.
            happyTx.gasLimit = 0;
            happyTx.executeGasLimit = 0;
            happyTx.maxFeePerGas = 0;
            happyTx.submitterFee = 0;
        }

        bytes memory signature = happyTx.validatorData;
        happyTx.validatorData = ""; // set to "" to get the hash
        // address signer = keccak256(happyTx.encode()).toEthSignedMessageHash().recover(signature);
        address signer = ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(keccak256(happyTx.encode())), signature);
        happyTx.validatorData = signature; // revert back to original value

        // NOTE: This piece of code may consume slightly more gas during simulation, which is conformant with the spec.
        return isSimulation
            ? signer == sessionKey
                ? nonceAhead == 0 ? bytes4(0) : FutureNonceDuringSimulation.selector
                : UnknownDuringSimulation.selector
            : signer == sessionKey ? bytes4(0) : InvalidOwnerSignature.selector;
    }

    // ====================================================================================================
    // SPECIAL FUNCTIONS

    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4) {
        return hash.recover(signature) == owner() ? MAGIC_VALUE : bytes4(0);
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    /// Returns the next nonce for a given nonce track, combining the track with its current nonce sequence
    function getNonce(uint192 nonceTrack) public view returns (uint256 nonce) {
        return nonceValue[nonceTrack] | (uint256(nonceTrack) << 64);
    }

    // ====================================================================================================
    // INTERNAL FUNCTIONS

    function _getStorageKey(address account, bytes20 target) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(account, target));
    }

    function _addSessionKey(address account, address targetContract, address sessionKey) internal {
        sessionKeyValidatorStorage[_getStorageKey(account, bytes20(targetContract))].sessionKey = sessionKey;
        emit SessionKeyAdded(account, targetContract, sessionKey);
    }

    function _removeSessionKey(address account, address targetContract) internal {
        delete sessionKeyValidatorStorage[_getStorageKey(account, bytes20(targetContract))];
        emit SessionKeyRemoved(account, targetContract);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
