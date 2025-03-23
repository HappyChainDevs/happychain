// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ECDSA} from "solady/utils/ECDSA.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "oz-upgradeable/access/OwnableUpgradeable.sol";

import {ICustomBoopValidator} from "../../interfaces/extensions/ICustomBoopValidator.sol";

import {HappyTx} from "../../core/HappyTx.sol";
import {HappyTxLib} from "../../libs/HappyTxLib.sol";
import {InvalidOwnerSignature} from "../../utils/Common.sol";

contract SessionKeyValidator is ICustomBoopValidator, ReentrancyGuardTransient, OwnableUpgradeable, UUPSUpgradeable {
    using ECDSA for bytes32;
    using HappyTxLib for HappyTx;

    // ====================================================================================================
    // EVENTS

    event SessionKeyAdded(address indexed account, address indexed target, address sessionKey);
    event SessionKeyRemoved(address indexed account, address indexed target);

    // ====================================================================================================
    // IMMUTABLES AND STATE VARIABLES

    mapping(bytes32 accountAndTargetHash => address sessionKeyAddress) private sessionKeys;

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

    function addSessionKeys(address[] calldata target, address[] calldata sessionKey) external {
        for (uint256 i = 0; i < target.length; i++) {
            _addSessionKey(msg.sender, target[i], sessionKey[i]);
        }
    }

    function removeSessionKeys(address[] calldata target) external {
        for (uint256 i = 0; i < target.length; i++) {
            _removeSessionKey(msg.sender, target[i]);
        }
    }

    function getSessionKey(address account, address target) external view returns (address) {
        return sessionKeys[_keyHash(account, target)];
    }

    function validate(HappyTx memory happyTx) external view returns (bytes4) {
        address sessionKey = sessionKeys[_keyHash(msg.sender, happyTx.dest)];

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
        address signer = keccak256(happyTx.encode()).toEthSignedMessageHash().recover(signature);
        happyTx.validatorData = signature; // revert back to original value

        return signer == sessionKey ? bytes4(0) : bytes4(InvalidOwnerSignature.selector);
    }

    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4) {
        // 0x1626ba7e is the ERC-1271 (isValidSignature) magic value that needs to returned as per
        // the EIP specification when verification is successful.
        return hash.recover(signature) == owner() ? bytes4(0x1626ba7e) : bytes4(0);
    }

    // ====================================================================================================
    // INTERNAL FUNCTIONS

    function _keyHash(address account, address target) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(account, target));
    }

    function _addSessionKey(address account, address target, address sessionKey) internal {
        sessionKeys[_keyHash(account, target)] = sessionKey;
        emit SessionKeyAdded(account, target, sessionKey);
    }

    function _removeSessionKey(address account, address target) internal {
        delete sessionKeys[_keyHash(account, target)];
        emit SessionKeyRemoved(account, target);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
