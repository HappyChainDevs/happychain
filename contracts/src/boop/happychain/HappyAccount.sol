// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.28;

import {ECDSA} from "solady/utils/ECDSA.sol";
import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "oz-upgradeable/access/OwnableUpgradeable.sol";

import {Utils} from "../core/Utils.sol";
import {Encoding} from "../core/Encoding.sol";

import {ICustomExecutor, EXECUTOR_KEY} from "../interfaces/ICustomExecutor.sol";
import {ICustomValidator, VALIDATOR_KEY} from "../interfaces/ICustomValidator.sol";
import {IExtensibleAccount} from "boop/interfaces/IExtensibleAccount.sol";
import {Boop, CallInfo, CallStatus, ExecutionOutput, ExtensionType} from "boop/interfaces/Types.sol";
import {
    InvalidSignature,
    NotFromEntryPoint,
    UnknownDuringSimulation,
    Received,
    ExtensionAlreadyRegistered,
    ExtensionNotRegistered,
    InvalidExtensionValue
} from "boop/interfaces/EventsAndErrors.sol";

/**
 * Implementation of an extensible account with proxy upgrade capability.
 */
contract HappyAccount is IExtensibleAccount, OwnableUpgradeable, UUPSUpgradeable {
    using ECDSA for bytes32;
    using Encoding for Boop;

    // ====================================================================================================
    // ERRORS

    /// @dev Selector returned if the upgrade call is not made from the account itself, or from the owner.
    error NotSelfOrOwner();

    // ====================================================================================================
    // IMMUTABLES AND STATE VARIABLES

    /// The allowed EntryPoint contract
    address public immutable ENTRYPOINT;

    /// Mapping to check if an extension is registered by type
    mapping(ExtensionType => mapping(address => bool)) public extensions;

    /// Custom executor that was dispatched to during this transaction.
    address transient private dispatchedExecutor;

    // ====================================================================================================
    // MODIFIERS

    /// @dev Checks if the the call was made from the EntryPoint contract
    modifier onlyFromEntryPoint() {
        if (msg.sender != ENTRYPOINT) revert NotFromEntryPoint();
        _;
    }

    /// @dev Checks if the the call was made from the owner or the account itself
    modifier onlySelfOrOwner() {
        if (msg.sender != address(this) && msg.sender != owner()) revert NotSelfOrOwner();
        _;
    }

    // ====================================================================================================
    // INITIALIZATION & UPDATES

    constructor(address _entrypoint) {
        ENTRYPOINT = _entrypoint;
        _disableInitializers();
    }

    /// Initializer for proxy instances. Called by the factory during proxy deployment.
    function initialize(address owner) external initializer {
        __Ownable_init(owner);
        __UUPSUpgradeable_init();
    }

    /// @dev Function that authorizes an upgrade of this contract via the UUPS proxy pattern
    function _authorizeUpgrade(address newImplementation) internal override onlySelfOrOwner {}

    // ====================================================================================================
    // EXTENSIONS

    function isExtensionRegistered(address extension, ExtensionType extensionType) external view returns (bool) {
        return extensions[extensionType][extension];
    }

    function addExtension(address extension, ExtensionType extensionType) external onlySelfOrOwner {
        if (extensions[extensionType][extension]) {
            revert ExtensionAlreadyRegistered(extension, extensionType);
        }

        extensions[extensionType][extension] = true;
        emit ExtensionAdded(extension, extensionType);
    }

    function removeExtension(address extension, ExtensionType extensionType) external onlySelfOrOwner {
        if (!extensions[extensionType][extension]) {
            revert ExtensionNotRegistered(extension, extensionType);
        }

        delete extensions[extensionType][extension];
        emit ExtensionRemoved(extension, extensionType);
    }

    function executeCallFromExecutor(CallInfo memory info) external returns (bool success, bytes memory returnData) {
        require(msg.sender == dispatchedExecutor, "not called from executor");
        return info.dest.call{value: info.value}(info.callData);
    }

    // ====================================================================================================
    // VALIDATE

    function validate(Boop memory boop) external onlyFromEntryPoint returns (bytes memory) {
        bytes4 validationResult;
        (bool found, bytes memory validatorAddress) = Utils.getExtraDataValue(boop.extraData, VALIDATOR_KEY);
        if (found) {
            if (validatorAddress.length != 20) {
                validationResult = InvalidExtensionValue.selector;
            } else {
                address validator = address(uint160(bytes20(validatorAddress)));
                if (!extensions[ExtensionType.Validator][validator]) {
                    validationResult = ExtensionNotRegistered.selector;
                } else {
                    return ICustomValidator(validator).validate(boop);
                }
            }
        } else {
            if (boop.payer != address(this)) {
                // The boop is not self-paying.
                // The signer does not sign over these fields to avoid extra network roundtrips
                // validation policy falls to the paymaster or the sponsoring submitter.
                boop.gasLimit = 0;
                boop.validateGasLimit = 0;
                boop.validatePaymentGasLimit = 0;
                boop.executeGasLimit = 0;
                boop.maxFeePerGas = 0;
                boop.submitterFee = 0;
            }

            bytes memory signature = boop.validatorData;
            boop.validatorData = ""; // set to "" to get the hash
            address signer = keccak256(abi.encodePacked(boop.encode(), block.chainid)).toEthSignedMessageHash().recover(signature);
            boop.validatorData = signature; // revert back to original value

            validationResult = signer == owner()
                ? bytes4(0)
                : tx.origin == address(0) ? UnknownDuringSimulation.selector : InvalidSignature.selector;
        }

        return abi.encodeWithSelector(validationResult);
    }

    // ====================================================================================================
    // EXECUTE

    function execute(Boop memory boop) external onlyFromEntryPoint returns (ExecutionOutput memory output) {
        (bool found, bytes memory executorAddress) = Utils.getExtraDataValue(boop.extraData, EXECUTOR_KEY);
        if (found) {
            if (executorAddress.length != 20) {
                output.status = CallStatus.EXECUTE_REJECTED;
                output.revertData = abi.encodeWithSelector(InvalidExtensionValue.selector);
            } else {
                address executor = address(uint160(bytes20(executorAddress)));
                if (!extensions[ExtensionType.Executor][executor]) {
                    output.status = CallStatus.EXECUTE_REJECTED;
                    output.revertData = abi.encodeWithSelector(ExtensionNotRegistered.selector);
                } else {
                    dispatchedExecutor = executor;
                    output = ICustomExecutor(executor).execute(boop);
                    dispatchedExecutor = address(0);
                }
            }
        } else {
            (bool success, bytes memory returnData) = boop.dest.call{value: boop.value}(boop.callData);
            if (!success) output.revertData = returnData;
            output.status = success ? CallStatus.SUCCEEDED : CallStatus.CALL_REVERTED;
        }
        return output;
    }

    // ====================================================================================================
    // PAYOUT

    function payout(uint256 amount) external onlyFromEntryPoint {
        (tx.origin.call{value: amount}(""));
    }

    // ====================================================================================================
    // OTHER

    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4) {
        // 0x1626ba7e is the ERC-1271 magic value to be returned in case of success
        return hash.recover(signature) == owner() ? bytes4(0x1626ba7e) : bytes4(0);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        // forgefmt: disable-next-item
        return interfaceId == 0x01ffc9a7  // ERC-165
            || interfaceId == 0x1626ba7e  // ERC-1271
            || interfaceId == 0x17ee373f  // IAccount
            || interfaceId == 0x2a73c833; // IExtensibleAccount
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
}
