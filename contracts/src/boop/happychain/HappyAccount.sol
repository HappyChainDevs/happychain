// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.28;

import {Encoding} from "boop/core/Encoding.sol";
import {Utils} from "boop/core/Utils.sol";
import {
    InvalidSignature,
    NotFromEntryPoint,
    UnknownDuringSimulation,
    Received,
    ExtensionAlreadyRegistered,
    ExtensionNotRegistered,
    InvalidExtensionValue
} from "boop/interfaces/EventsAndErrors.sol";
import {ICustomExecutor, EXECUTOR_KEY} from "boop/interfaces/ICustomExecutor.sol";
import {ICustomValidator, VALIDATOR_KEY} from "boop/interfaces/ICustomValidator.sol";
import {IExtensibleAccount} from "boop/interfaces/IExtensibleAccount.sol";
import {Boop, CallInfo, CallStatus, ExecutionOutput, ExtensionType} from "boop/interfaces/Types.sol";
import {ExcessivelySafeCall} from "ExcessivelySafeCall/ExcessivelySafeCall.sol";
import {OwnableUpgradeable} from "oz-upgradeable/access/OwnableUpgradeable.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";

/**
 * Implementation of an extensible account
 */
contract HappyAccount is IExtensibleAccount, OwnableUpgradeable {
    using ECDSA for bytes32;
    using Encoding for Boop;
    using ExcessivelySafeCall for address;

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
    address private transient dispatchedExecutor;

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
    }

    // ====================================================================================================
    // EXTENSIONS

    function isExtensionRegistered(address extension, ExtensionType extensionType) external view returns (bool) {
        return extensions[extensionType][extension];
    }

    /// @inheritdoc IExtensibleAccount
    function addExtension(address extension, ExtensionType extensionType, bytes memory installData)
        external
        onlySelfOrOwner
    {
        if (extensions[extensionType][extension]) {
            revert ExtensionAlreadyRegistered(extension, extensionType);
        }

        extensions[extensionType][extension] = true;
        emit ExtensionAdded(extension, extensionType);

        if (installData.length > 0) {
            (bool success, bytes memory returnData) = extension.call(installData);
            if (!success) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
        }
    }

    function removeExtension(address extension, ExtensionType extensionType, bytes memory uninstallData)
        external
        onlySelfOrOwner
    {
        if (!extensions[extensionType][extension]) {
            revert ExtensionNotRegistered(extension, extensionType);
        }

        delete extensions[extensionType][extension];
        emit ExtensionRemoved(extension, extensionType);

        if (uninstallData.length > 0) {
            (bool success, bytes memory returnData) = extension.call(uninstallData);
            if (!success) {
                assembly {
                    revert(add(returnData, 32), mload(returnData))
                }
            }
        }
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
            bytes memory signature = boop.validatorData;
            // Call with restore=false since the boop isn't used here after computing the hash.
            address signer = Utils.computeBoopHash(boop, false).tryRecover(signature);
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
            (bool success, bytes memory returnData) = boop.dest.excessivelySafeCall(
                // Buffer to ensure we have enough gas left to return.
                // We have measure excessivelySafeCall overhead < 600 and output assignment ~100.
                gasleft() - 1000,
                boop.value,
                256, // max return size
                boop.callData
            );
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
        return hash.tryRecover(signature) == owner() ? bytes4(0x1626ba7e) : bytes4(0);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        // forgefmt: disable-next-item
        return interfaceId == 0x01ffc9a7  // ERC-165
            || interfaceId == 0x1626ba7e  // ERC-1271
            || interfaceId == 0x2eaf0775  // IAccount
            || interfaceId == 0xc08f1683; // IExtensibleAccount
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
}
