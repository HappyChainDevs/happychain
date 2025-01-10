// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {IHappyAccount} from "./interfaces/IHappyAccount.sol";
import {IHappyValidator} from "./interfaces/IHappyValidator.sol";
import {IHappyPaymaster} from "./interfaces/IHappyPaymaster.sol";

import {HappyTxLib} from "./libs/HappyTxLib.sol";

import {HappyTx} from "./HappyTx.sol";
import {NonceManager} from "./NonceManager.sol";

import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

/**
 * @title  HappyAccount
 * @dev    Base implementation of a Happy Account with nonce management, reentrancy protection,
 *         and proxy upgrade capability
 */
contract HappyAccount is IHappyAccount, NonceManager, ReentrancyGuardTransient {
    //* //////////////////////////////////////
    //* State variables //////////////////////
    //* //////////////////////////////////////

    bytes32 internal constant ERC1967_IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    uint256 private constant INTRINSIC_GAS = 22_000; // Base gas cost
    uint256 private constant GAS_OVERHEAD_BUFFER = 100; // Additional gas buffer
    uint256 private constant CALLDATA_GAS_PER_BYTE = 16; // Gas per byte of calldata
    uint256 private constant CALLDATA_LENGTH_ADJUSTMENT = 4; // Adjustment for function selector

    /// @dev The factory that deployed this proxy
    address private _factory;

    /// @dev The owner who can upgrade the implementation
    address private _owner;

    /// @dev The root validator address that has administrative privileges (optional)
    address public rootValidator;

    /// @dev Mapping to track approved validators who can validate transactions
    mapping(address => bool) public approvedValidators;

    //* //////////////////////////////////////
    //* Events ///////////////////////////////
    //* //////////////////////////////////////

    event Upgraded(address indexed implementation);
    event Received(address sender, uint256 amount);
    event CallReverted(bytes returnData);
    event RootValidatorChanged(address indexed validator);
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);

    //* //////////////////////////////////////
    //* Errors ///////////////////////////////
    //* //////////////////////////////////////

    error GasPriceTooHigh();
    error InvalidNonce();
    error NotAuthorized();
    error ImplementationInvalid();
    error AlreadyInitialized();
    error InvalidOwner();
    error InvalidFactory();
    error AccountValidationFailed(bytes4);
    error PaymasterValidationFailed(bytes4);
    error PaymasterValidationReverted(bytes revertData);
    error AccountBalanceInsufficient();
    error PaymasterBalanceInsufficient();
    error AccountPaymentFailed();
    error PaymasterPaymentFailed();
    error WrongAccount();
    error AccountValidationReverted(bytes revertData);
    error AccountPaymentCameShort(uint256);
    error PaymasterPaymentCameShort(uint256);
    error InvalidValidator();
    error ValidatorNotApproved();

    //* //////////////////////////////////////
    //* Modifiers ////////////////////////////
    //* //////////////////////////////////////

    /// @dev Checks if the validator address is valid and if the caller is authorized
    modifier validatorCheck(address _validator) {
        if (_validator == address(0)) revert InvalidValidator();
        if (msg.sender != _owner) revert NotAuthorized();
        _;
    }

    //* //////////////////////////////////////
    //* Constructor //////////////////////////
    //* //////////////////////////////////////
    /**
     * @dev Constructor for the implementation contract.
     *      This will only be called once when deploying the implementation.
     *
     * IMPORTANT: Setting owner = address(1) serves as a security measure:
     * 1. The implementation contract itself is never meant to be used directly,
     *    it only serves as a template for proxies to delegatecall to.
     * 2. Setting owner to a non-zero address prevents anyone from calling initialize()
     *    on the implementation (initialize() checks owner == address(0))
     * 3. The actual owner for each proxy is set during initialize()
     * 4. When upgradeTo() is called on a proxy:
     *    - It uses the proxy's storage for owner (not implementation's)
     *    - Each proxy has its own owner who can upgrade that specific proxy
     *    - The implementation's owner (address(1)) is never used
     */
    constructor() {
        _owner = address(1);
    }

    //* //////////////////////////////////////
    //* External functions - payable /////////
    //* //////////////////////////////////////
    /**
     * @dev Initializer for proxy instances
     *      Called by factory during proxy deployment
     * @param _newOwner The owner who can upgrade the implementation
     */
    function initialize(address _newOwner) external payable {
        // Ensure we're a proxy and not the implementation
        if (_owner != address(0)) revert AlreadyInitialized();
        if (_newOwner == address(0)) revert InvalidOwner();

        // Set the factory to the caller (must be called by factory)
        _factory = msg.sender;
        _owner = _newOwner;
    }

    /**
     * @dev Upgrades the implementation of the proxy
     * @param _newImplementation Address of the new implementation
     */
    function upgradeTo(address _newImplementation) external payable {
        if (msg.sender != _owner) revert NotAuthorized();
        if (_newImplementation == address(0)) revert ImplementationInvalid();

        // solhint-disable-next-line no-inline-assembly
        assembly {
            sstore(ERC1967_IMPLEMENTATION_SLOT, _newImplementation)
        }

        emit Upgraded(_newImplementation);
    }

    function execute(bytes calldata encodedHappyTx) external payable override nonReentrant returns (uint256) {}

    //* //////////////////////////////////////
    //* Special functions ////////////////////
    //* //////////////////////////////////////

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    fallback() external payable {
        emit Received(msg.sender, msg.value);
    }

    //* //////////////////////////////////////
    //* External functions ///////////////////
    //* //////////////////////////////////////

    function setRootValidator(address _validator) external {
        if (_validator == address(0)) revert InvalidValidator();
        if (msg.sender != _owner) revert NotAuthorized();

        rootValidator = _validator;
        emit RootValidatorChanged(_validator);
    }

    function addValidator(address _validator) external validatorCheck(_validator) {
        approvedValidators[_validator] = true;
        emit ValidatorAdded(_validator);
    }

    function removeValidator(address _validator) external validatorCheck(_validator) {
        approvedValidators[_validator] = false;
        emit ValidatorRemoved(_validator);
    }

    //* //////////////////////////////////////
    //* External functions - view ////////////
    //* //////////////////////////////////////

    function factory() external view override returns (address) {
        return _factory;
    }

    function owner() external view override returns (address) {
        return _owner;
    }

    //* //////////////////////////////////////
    //* Public functions /////////////////////
    //* //////////////////////////////////////

    function validateHappyTx(bytes calldata encodedHappyTx) public override returns (bytes4) {}

    //* //////////////////////////////////////
    //* Internal functions ///////////////////
    //* //////////////////////////////////////

    function _domainNameAndVersion() internal pure returns (string memory name, string memory version) {
        name = "HappyAccount";
        version = "0.1.0";
    }

    function _internalValidate(bytes memory validationData) internal virtual returns (bytes4) {
        (validationData);
        return bytes4(0);
    }
}
