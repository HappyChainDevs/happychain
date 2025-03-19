// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.28;

import {ExcessivelySafeCall} from "ExcessivelySafeCall/ExcessivelySafeCall.sol";

import {ECDSA} from "solady/utils/ECDSA.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "oz-upgradeable/access/OwnableUpgradeable.sol";

import {IHappyPaymaster} from "../interfaces/IHappyPaymaster.sol";
import {ExecutionOutput, GasPriceTooHigh, InvalidNonce, WrongAccount} from "../interfaces/IHappyAccount.sol";

import {ICustomBoopValidator, VALIDATOR_KEY} from "../interfaces/extensions/ICustomBoopValidator.sol";
import {ICustomBoopExecutor, EXECUTOR_KEY} from "../interfaces/extensions/ICustomBoopExecutor.sol";
import {
    IExtensibleBoopAccount,
    ExtensionType,
    ExtensionAlreadyRegistered,
    ExtensionNotRegistered,
    InvalidExtensionValue,
    CallInfo
} from "../interfaces/extensions/IExtensibleBoopAccount.sol";

import {HappyTx} from "../core/HappyTx.sol";
import {HappyTxLib} from "../libs/HappyTxLib.sol";
import {
    FutureNonceDuringSimulation,
    InvalidSignature,
    NotFromEntryPoint,
    UnknownDuringSimulation
} from "../utils/Common.sol";

import {CallStatus} from "../core/HappyEntryPoint.sol";

// [LOGGAS_INTERNAL] import {console} from "forge-std/Script.sol";

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

    /**
     * @dev Maximum amount of data allowed to be returned from {IHappyAccount.validate}.
     * The returned data is as follows:
     * 1st slot: bytes4 selector (minimum 32 bytes are neded to decode the return data)
     */
    uint16 private constant MAX_VALIDATE_RETURN_DATA_SIZE = 32;

    /// @dev ERC-1271 selector
    bytes4 private constant MAGIC_VALUE = 0x1626ba7e; // ERC-1271

    /// @dev Payout function logic cost before payment call
    uint256 private constant PAYOUT_INTRINSIC_GAS_OVERHEAD = 400; // 390 from the gas report

    /// @dev The amount of gas that is added to the payment of the submitter.
    uint256 private constant PAYOUT_PAYMENT_OVERHEAD_GAS = 9500; // 9368 from the gas report

    /// @dev Gas overhead for executing the execute function, not measured by gasleft()
    uint256 private constant EXECUTE_INTRINSIC_GAS_OVERHEAD = 79;

    /// @dev Interface IDs
    bytes4 private constant ERC165_INTERFACE_ID = 0x01ffc9a7;
    bytes4 private constant ERC1271_INTERFACE_ID = 0x1626ba7e;
    bytes4 private constant IHAPPYACCOUNT_INTERFACE_ID = 0x909c11f4;
    bytes4 private constant IHAPPYPAYMASTER_INTERFACE_ID = 0x9c7b367f;

    // ====================================================================================================
    // IMMUTABLES AND STATE VARIABLES

    /// The allowed EntryPoint contract
    address public immutable ENTRYPOINT;

    /// Mapping from track => nonce
    mapping(uint192 => uint256) private nonceValue;

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
    // CONSTRUCTOR

    constructor(address _entrypoint) {
        ENTRYPOINT = _entrypoint;
        _disableInitializers();
    }

    /// Initializer for proxy instances. Called by the factory during proxy deployment.
    function initialize(address owner) external initializer {
        __Ownable_init(owner);
        __UUPSUpgradeable_init();
    }

    // ====================================================================================================
    // EXTERNAL FUNCTIONS

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

    function validate(HappyTx memory happyTx) external onlyFromEntryPoint returns (bytes memory) {
        if (happyTx.account != address(this)) {
            return abi.encodeWithSelector(WrongAccount.selector);
        }

        if (tx.gasprice > happyTx.maxFeePerGas) {
            return abi.encodeWithSelector(GasPriceTooHigh.selector);
        }

        bool isSimulation = tx.origin == address(0);
        int256 nonceAhead = int256(uint256(happyTx.nonceValue)) - int256(nonceValue[happyTx.nonceTrack]);
        if (nonceAhead < 0 || (!isSimulation && nonceAhead != 0)) return abi.encodeWithSelector(InvalidNonce.selector);
        nonceValue[happyTx.nonceTrack]++;

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

            // NOTE: This piece of code may consume slightly more gas during simulation, which is conformant with the spec.
            validationResult = signer == owner()
                ? bytes4(0)
                : isSimulation ? UnknownDuringSimulation.selector : InvalidSignature.selector;
        }

        validationResult = validationResult == bytes4(0)
            ? nonceAhead == 0 ? bytes4(0) : FutureNonceDuringSimulation.selector
            : validationResult;

        return abi.encodeWithSelector(validationResult);
    }

<<<<<<< HEAD
    function execute(HappyTx memory happyTx) external onlyFromEntryPoint returns (ExecutionOutput memory output) {
        uint256 gasStart = gasleft();
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

        output.gas = uint32(gasStart - gasleft() + EXECUTE_INTRINSIC_GAS_OVERHEAD);

        // [LOGGAS_INTERNAL] uint256 endGas = gasleft();
        // [LOGGAS_INTERNAL] console.log("execute function gas usage: ", startGas - endGas);
        // [LOGGAS_INTERNAL] console.log("execute output.gas: ", output.gas);

        return output;
    }

    function payout(HappyTx memory happyTx, uint256 consumedGas) external onlyFromEntryPoint returns (bytes memory) {
        // [LOGGAS_INTERNAL] uint256 gasOverheadStart = gasleft();

        if (happyTx.account != address(this)) {
            return abi.encodeWithSelector(WrongAccount.selector);
        }

        int256 _owed = int256(
            (consumedGas + PAYOUT_INTRINSIC_GAS_OVERHEAD + PAYOUT_PAYMENT_OVERHEAD_GAS) * happyTx.maxFeePerGas
        ) + happyTx.submitterFee;
        uint256 owed = _owed > 0 ? uint256(_owed) : 0;

        // [LOGGAS_INTERNAL] uint256 gasPaymentStart = gasleft(); // emulates the cost of the top gasleft call

        // Ignoring the return value of the transfer, as the balances are verified inside the HappyEntryPoint
        (payable(tx.origin).call{value: owed}(""));

        // [LOGGAS_INTERNAL] uint256 gasPaymentEnd = gasleft();
        // [LOGGAS_INTERNAL] console.log("PAYOUT_PAYMENT_OVERHEAD_GAS", gasPaymentStart - gasPaymentEnd);
        // [LOGGAS_INTERNAL] console.log("PAYOUT_INTRINSIC_GAS_OVERHEAD", gasOverheadStart - gasPaymentStart);
        // [LOGGAS_INTERNAL] console.log("overall payout function gas usage = ", gasOverheadStart - gasPaymentEnd);

        return abi.encodeWithSelector(bytes4(0));
    }

    function executeCall(CallInfo memory info) external returns (bool success, bytes memory returnData) {
        require(msg.sender == dispatchedExecutor, "not called from executor");
        return info.dest.call{value: info.value}(info.callData);
    }

    // ====================================================================================================
    // SPECIAL FUNCTIONS

    function isValidSignature(bytes32 hash, bytes memory signature) external view returns (bytes4) {
        return hash.recover(signature) == owner() ? MAGIC_VALUE : bytes4(0);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        // forgefmt: disable-next-item
        return interfaceId == ERC165_INTERFACE_ID
            || interfaceId == ERC1271_INTERFACE_ID
            || interfaceId == IHAPPYACCOUNT_INTERFACE_ID
            || interfaceId == IHAPPYPAYMASTER_INTERFACE_ID;
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    // ====================================================================================================
    // INTERNAL FUNCTIONS

    /// @dev Function that authorizes an upgrade of this contract via the UUPS proxy pattern
    function _authorizeUpgrade(address newImplementation) internal override onlySelfOrOwner {}
}
