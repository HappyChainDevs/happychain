// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ECDSA} from "solady/utils/ECDSA.sol";

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
import {
    FutureNonceDuringSimulation,
    InvalidOwnerSignature,
    NotFromEntryPoint,
    UnknownDuringSimulation
} from "../utils/Common.sol";

// [LOGGAS_INTERNAL] import {console} from "forge-std/Script.sol";

/**
 * Example implementation of a Happy Account with nonce management, reentrancy protection,
 * and proxy upgrade capability.
 */
contract ScrappyAccount is
    IHappyAccount,
    IHappyPaymaster,
    ReentrancyGuardTransient,
    OwnableUpgradeable,
    UUPSUpgradeable
{
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
    mapping(uint192 => uint64) public nonceValue;

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

    function validate(HappyTx memory happyTx) external returns (bytes4) {
        if (happyTx.account != address(this)) {
            return WrongAccount.selector;
        }

        if (tx.gasprice > happyTx.maxFeePerGas) {
            return GasPriceTooHigh.selector;
        }

        bool isSimulation = tx.origin == address(0);
        int64 nonceAhead = int64(happyTx.nonceValue) - int64(nonceValue[happyTx.nonceTrack]);

        if (nonceAhead < 0 || (!isSimulation && nonceAhead != 0)) return InvalidNonce.selector;
        nonceValue[happyTx.nonceTrack]++;

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

        output.gas = startGas - gasleft() + EXECUTE_INTRINSIC_GAS_OVERHEAD;

        // [LOGGAS_INTERNAL] uint256 _startGasEmulate = gasleft(); // To simulate the gasleft() at the top of the function
        // [LOGGAS_INTERNAL] uint256 endGas = gasleft();
        // [LOGGAS_INTERNAL] console.log("execute function gas usage: ", startGas-endGas);
        // [LOGGAS_INTERNAL] console.log("execute output.gas: ", output.gas);
    }

    function payout(HappyTx memory happyTx, uint256 consumedGas) external onlyFromEntryPoint returns (bytes4) {
        // [LOGGAS_INTERNAL] uint256 gasOverheadStart = gasleft();

        if (happyTx.account != address(this)) {
            return WrongAccount.selector;
        }

        int256 _owed = int256(
            (consumedGas + PAYOUT_INTRINSIC_GAS_OVERHEAD + PAYOUT_PAYMENT_OVERHEAD_GAS) * happyTx.maxFeePerGas
        ) + happyTx.submitterFee;
        uint256 owed = _owed > 0 ? uint256(_owed) : 0;

        // [LOGGAS_INTERNAL] uint256 gasPaymentStart = gasleft(); // emulates the cost of the top gasleft call

        // Ignoring the return value of the transfer, as the balances are verified inside the HappyEntryPoint
        (payable(tx.origin).call{value: owed}(""));

        // [LOGGAS_INTERNAL] console.log("PAYOUT_PAYMENT_OVERHEAD_GAS", gasPaymentStart - gasleft());
        // [LOGGAS_INTERNAL] console.log("PAYOUT_INTRINSIC_GAS_OVERHEAD", gasOverheadStart - gasPaymentStart);

        return 0;
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
    // VIEW FUNCTIONS

    /// Returns the next nonce for a given nonce track, combining the track with its current nonce sequence
    function getNonce(uint192 nonceTrack) external view returns (uint256) {
        return nonceValue[nonceTrack] | (uint256(nonceTrack) << 64);
    }

    /// Returns the current nonce value for a given nonce track
    function getNonceValue(uint192 nonceTrack) external view returns (uint256) {
        return nonceValue[nonceTrack];
    }

    // ====================================================================================================
    // INTERNAL FUNCTIONS

    /// @dev Function that authorizes an upgrade of this contract via the UUPS proxy pattern
    function _authorizeUpgrade(address newImplementation) internal override onlySelfOrOwner {}
}
