// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.28;

import {ExcessivelySafeCall} from "ExcessivelySafeCall/ExcessivelySafeCall.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "oz-upgradeable/access/OwnableUpgradeable.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";

import {CallStatus} from "boop/core/HappyEntryPoint.sol";
import {HappyTx} from "boop/core/HappyTx.sol";
import {ExecutionOutput} from "boop/interfaces/IHappyAccount.sol";
import {IHappyPaymaster} from "boop/interfaces/IHappyPaymaster.sol";
import {ICustomBoopExecutor, EXECUTOR_KEY} from "boop/interfaces/extensions/ICustomBoopExecutor.sol";
import {ICustomBoopValidator, VALIDATOR_KEY} from "boop/interfaces/extensions/ICustomBoopValidator.sol";
import {
    IExtensibleBoopAccount,
    ExtensionType,
    ExtensionAlreadyRegistered,
    ExtensionNotRegistered,
    InvalidExtensionValue,
    CallInfo
} from "boop/interfaces/extensions/IExtensibleBoopAccount.sol";
import {HappyTxLib} from "boop/libs/HappyTxLib.sol";
import {
    InvalidSignature,
    NotFromEntryPoint,
    UnknownDuringSimulation
} from "boop/utils/Common.sol";

/**
 * Example implementation of a Happy Account with nonce management, reentrancy protection,
 * and proxy upgrade capability.
 */
contract ScrappyAccount is
    IExtensibleBoopAccount,
    IHappyPaymaster,
    ReentrancyGuardTransient,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // Must be used to avoid gas exhaustion via return data.
    using ExcessivelySafeCall for address;

    using ECDSA for bytes32;
    using HappyTxLib for HappyTx;

    // ====================================================================================================
    // ERRORS

    /// @dev Selector returned if the upgrade call is not made from the account itself, or from the owner.
    error NotSelfOrOwner();

    // ====================================================================================================
    // EVENTS

    /// Emitted when ETH is received by the contract
    event Received(address indexed sender, uint256 amount);

    // ====================================================================================================
    // CONSTANTS

    /// @dev The amount of gas consumed by the payout function.
    uint256 private constant PAYOUT_GAS = 15_000; // measured: 12833 + safety margin

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

    function executeCall(CallInfo memory info) external returns (bool success, bytes memory returnData) {
        require(msg.sender == dispatchedExecutor, "not called from executor");
        return info.dest.call{value: info.value}(info.callData);
    }

    // ====================================================================================================
    // VALIDATE

    function validate(HappyTx memory happyTx) external onlyFromEntryPoint returns (bytes memory) {
        bytes4 validationResult;
        (bool found, bytes memory validatorAddress) = HappyTxLib.getExtraDataValue(happyTx.extraData, VALIDATOR_KEY);

        if (found) {
            if (validatorAddress.length != 20) {
                validationResult = InvalidExtensionValue.selector;
            } else {
                address validator = address(uint160(bytes20(validatorAddress)));
                if (!extensions[ExtensionType.Validator][validator]) {
                    validationResult = ExtensionNotRegistered.selector;
                } else {
                    validationResult = ICustomBoopValidator(validator).validate(happyTx);
                }
            }
        } else {
            if (happyTx.paymaster != address(this)) {
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

            validationResult = signer == owner()
                ? bytes4(0)
                : tx.origin == address(0) ? UnknownDuringSimulation.selector : InvalidSignature.selector;
        }

        return abi.encodeWithSelector(validationResult);
    }

    // ====================================================================================================
    // EXECUTE

    function execute(HappyTx memory happyTx) external onlyFromEntryPoint returns (ExecutionOutput memory output) {
        (bool found, bytes memory executorAddress) = HappyTxLib.getExtraDataValue(happyTx.extraData, EXECUTOR_KEY);
        if (found) {
            if (executorAddress.length != 20) {
                output.status = CallStatus.EXECUTE_FAILED;
                output.revertData = abi.encodeWithSelector(InvalidExtensionValue.selector);
            } else {
                address executor = address(uint160(bytes20(executorAddress)));
                if (!extensions[ExtensionType.Executor][executor]) {
                    output.status = CallStatus.EXECUTE_FAILED;
                    output.revertData = abi.encodeWithSelector(ExtensionNotRegistered.selector);
                } else {
                    dispatchedExecutor = executor;
                    output = ICustomBoopExecutor(executor).execute(happyTx);
                    dispatchedExecutor = address(0);
                }
            }
        } else {
            (bool success, bytes memory returnData) = happyTx.dest.call{value: happyTx.value}(happyTx.callData);
            if (!success) output.revertData = returnData;
            output.status = success ? CallStatus.SUCCEEDED : CallStatus.CALL_REVERTED;
        }
        return output;
    }

    // ====================================================================================================
    // PAYOUT

    /**
     * We always accept to self-pay boops (that we previously validated via {validate}).
     *
     * Note that for self-paid transaction, the submitter fee will be signed over so there is no
     * need to validate that it is reasonable.
     */
    function validatePayment(HappyTx memory /* happyTx */) external onlyFromEntryPoint returns (bytes memory) {
        return abi.encodeWithSelector(bytes4(0));
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
            || interfaceId == 0x2b39e81f  // IHappyAccount
            || interfaceId == 0x24542ca5  // IHappyPaymaster
            || interfaceId == 0xf0223481; // IExtensibleBoopAccount
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
}
