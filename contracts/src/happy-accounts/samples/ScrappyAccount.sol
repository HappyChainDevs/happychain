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
import {
    FutureNonceDuringSimulation,
    InvalidOwnerSignature,
    NotFromEntryPoint,
    UnknownDuringSimulation
} from "../utils/Common.sol";

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
    using MessageHashUtils for bytes32;

    // ====================================================================================================
    // ERRORS

    /// @dev Selector returned if the upgrade call is not made from the owner or the account itself.
    error NotFromOwnerOrSelf();

    // ====================================================================================================
    // EVENTS

    /// Emitted when the contract implementation is upgraded to a new implementation
    event Upgraded(address indexed newImplementation);

    /// Emitted when ETH is received by the contract
    event Received(address indexed sender, uint256 amount);

    // ====================================================================================================
    // CONSTANTS

    /// @dev ERC-1271 selector
    bytes4 private constant MAGIC_VALUE = 0x1626ba7e; // ERC-1271

    /// @dev Standard Ethereum transaction base cost (21_000) + payout function logic cost (9_600)
    uint256 private constant INTRINSIC_GAS = 30_600;

    /// @dev Gas overhead for executing the execute function, not measured by gasleft()
    uint256 private constant GAS_OVERHEAD_BUFFER = 79;
    // ^ From the gas report, equals total execute function gas usage - output.gas

    /// @dev The amount of gas that is added to the payment of the submitter. (9480 from gas report)
    uint256 private constant PAYMENT_OVERHEAD_GAS = 9500;

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
    modifier onlyFromSelf() {
        if (msg.sender != address(this)) revert NotFromOwnerOrSelf();
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
        uint256 happyTxNonce = (happyTx.nonceTrack << 192) | happyTx.nonceValue;
        uint256 currentNonce = getNonce(happyTx.nonceTrack);
        int256 nonceAhead = int256(happyTxNonce) - int256(currentNonce);

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

        output.gas = startGas - gasleft() + GAS_OVERHEAD_BUFFER;
    }

    function payout(HappyTx memory happyTx, uint256 consumedGas) external onlyFromEntryPoint returns (bytes4) {
        uint256 gasStart = gasleft();
        if (happyTx.account != address(this)) {
            return WrongAccount.selector;
        }

        uint256 owed =
            (consumedGas + INTRINSIC_GAS + PAYMENT_OVERHEAD_GAS) * happyTx.maxFeePerGas + uint256(happyTx.submitterFee);
        // ^MAGIC VARIABLE TO DEFINE, which must account of for the cost of the code below, see LOGGAS code for computing it

        // [LOGGAS_INTERNAL] uint256 gasStartOverhead = gasleft();
        // [LOGGAS_INTERNAL] uint256 gasStartEmulate = gasleft(); // emulates the cost of the top gasleft call
        owed += gasStart - gasleft();

        // Ignoring the return value of the transfer, as the balances are verified inside the HappyEntryPoint
        (payable(tx.origin).call{value: owed}(""));

        // [LOGGAS_INTERNAL] console.log("PAYMENT_OVERHEAD_GAS: ", gasStartOverhead - gasleft());

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
    function getNonce(uint192 nonceTrack) public view returns (uint256 nonce) {
        return nonceValue[nonceTrack] | (uint256(nonceTrack) << 64);
    }

    // ====================================================================================================
    // INTERNAL FUNCTIONS

    /// @dev Function that authorizes an upgrade of this contract via the UUPS proxy pattern
    function _authorizeUpgrade(address newImplementation) internal override onlyFromSelf() {}
}
