// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ECDSA} from "solady/utils/ECDSA.sol";
import {IValidator} from "kernel/interfaces/IERC7579Modules.sol";
import {PackedUserOperation} from "kernel/interfaces/PackedUserOperation.sol";
import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "oz-upgradeable/access/OwnableUpgradeable.sol";
import {
    ERC1271_MAGICVALUE,
    ERC1271_INVALID,
    MODULE_TYPE_VALIDATOR,
    SIG_VALIDATION_SUCCESS_UINT,
    SIG_VALIDATION_FAILED_UINT
} from "kernel/types/Constants.sol";

struct SessionKeyValidatorStorage {
    address sessionKey;
}

contract SessionKeyValidator is IValidator, OwnableUpgradeable, UUPSUpgradeable {
    ///@dev keccak256(account, targetContract) => SessionKeyValidatorStorage
    mapping(bytes32 => SessionKeyValidatorStorage) public sessionKeyValidatorStorage;

    mapping(address => bool) public initialized;

    event SessionKeyAdded(address indexed account, address indexed targetContract, address sessionKey);
    event SessionKeyRemoved(address indexed account, address indexed targetContract);

    uint256[50] private __gap; // reserve space for upgradeability

    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
    }

    function onInstall(bytes calldata _data) external payable override {
        if (initialized[msg.sender]) {
            revert AlreadyInitialized(msg.sender);
        }
        address sessionKey = address(bytes20(_data[0:20]));
        bytes20 targetContract = bytes20(_data[20:40]);
        _addSessionKey(msg.sender, address(targetContract), sessionKey);

        initialized[msg.sender] = true;
    }

    function onUninstall(bytes calldata) external payable override {
        delete initialized[msg.sender];
    }

    function addSessionKeys(address[] calldata targetContract, address[] calldata sessionKey) external payable {
        for (uint256 i = 0; i < targetContract.length; i++) {
            _addSessionKey(msg.sender, targetContract[i], sessionKey[i]);
        }
    }

    function removeSessionKeys(address[] calldata targetContract) external payable {
        for (uint256 i = 0; i < targetContract.length; i++) {
            _removeSessionKey(msg.sender, targetContract[i]);
        }
    }

    function isModuleType(uint256 typeID) external pure override returns (bool) {
        return typeID == MODULE_TYPE_VALIDATOR;
    }

    function isInitialized(address smartAccount) external view override returns (bool) {
        return initialized[smartAccount];
    }

    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash)
        external
        payable
        override
        returns (uint256)
    {
        bytes20 targetContract = bytes20(userOp.callData[100:120]);
        address sessionKey = sessionKeyValidatorStorage[_getStorageKey(msg.sender, targetContract)].sessionKey;
        bytes32 ethHash = ECDSA.toEthSignedMessageHash(userOpHash);

        /**
         * Note: Although this logic could be refactored to call @isValidSignatureWithSender,
         * we avoid the additional function call here due to gas efficiency concerns,
         * as this function is frequently executed.
         */
        if (sessionKey == ECDSA.recover(ethHash, userOp.signature)) {
            return SIG_VALIDATION_SUCCESS_UINT;
        }

        return SIG_VALIDATION_FAILED_UINT;
    }

    ///@dev called by the smart account to validate the signature of a call destined for the `to` address
    function isValidSignatureWithSender(address to, bytes32 hash, bytes calldata sig)
        external
        view
        override
        returns (bytes4)
    {
        address sessionKey = sessionKeyValidatorStorage[_getStorageKey(msg.sender, bytes20(to))].sessionKey;
        bytes32 ethHash = ECDSA.toEthSignedMessageHash(hash);
        if (sessionKey != ECDSA.recover(ethHash, sig)) {
            return ERC1271_INVALID;
        }

        return ERC1271_MAGICVALUE;
    }

    function getStorageKey(address account, bytes20 target) public pure returns (bytes32) {
        return _getStorageKey(account, target);
    }

    // Internal helper functions
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
