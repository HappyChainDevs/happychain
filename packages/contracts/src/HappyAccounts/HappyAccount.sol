// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {IHappyAccount} from "./interfaces/IHappyAccount.sol";
import {IHappyValidator} from "./interfaces/IHappyValidator.sol";
import {IHappyPaymaster} from "./interfaces/IHappyPaymaster.sol";

import {HappyTxLib} from "./libs/HappyTxLib.sol";

import {HappyTx} from "./HappyTx.sol";
import {NonceManager} from "./NonceManager.sol";

import {ReentrancyGuard} from "@openzeppelin/utils/ReentrancyGuard.sol";

/**
 * @title  HappyAccount
 * @dev    Base implementation of a Happy Account with nonce management, reentrancy protection,
 *         and proxy upgrade capability
 */
contract HappyAccount is IHappyAccount, NonceManager, ReentrancyGuard {
    // ERC1967 implementation slot
    bytes32 internal constant ERC1967_IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    // Gas constants
    uint256 private constant INTRINSIC_GAS = 22000; // Base gas cost
    uint256 private constant CALLDATA_GAS_PER_BYTE = 16; // Gas per byte of calldata
    uint256 private constant GAS_OVERHEAD_BUFFER = 100; // Additional gas buffer
    uint256 private constant CALLDATA_LENGTH_ADJUSTMENT = 4; // Adjustment for function selector

    /// @dev The factory that deployed this proxy
    address private _factory;

    /// @dev The owner who can upgrade the implementation
    address public owner;

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

    event Upgraded(address indexed implementation);
    event Received(address sender, uint256 amount);
    event CallReverted(bytes returnData);
    event RootValidatorChanged(address indexed validator);
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);

    address public rootValidator;
    mapping(address => bool) public approvedValidators;

    /**
     * @dev Computes the hash for transaction validation
     * @param happyTx The transaction to compute hash for
     * @return Hash of the transaction data
     */
    function _computeValidationHash(HappyTx memory happyTx) internal view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                happyTx.account,
                happyTx.dest,
                happyTx.value,
                keccak256(happyTx.callData),
                happyTx.nonceTrack,
                happyTx.nonce,
                happyTx.maxFeePerGas,
                happyTx.gasLimit,
                block.chainid
            )
        );
    }

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
        owner = address(1);
    }

    /**
     * @dev Initializer for proxy instances
     *      Called by factory during proxy deployment
     * @param _owner The owner who can upgrade the implementation
     */
    function initialize(address _owner) external payable {
        // Ensure we're a proxy and not the implementation
        if (owner != address(0)) revert AlreadyInitialized();
        if (_owner == address(0)) revert InvalidOwner();

        // Set the factory to the caller (must be called by factory)
        _factory = msg.sender;
        if (_factory == address(0)) revert InvalidFactory();

        owner = _owner;
    }

    function _domainNameAndVersion() internal pure returns (string memory name, string memory version) {
        name = "HappyAccount";
        version = "0.1.0";
    }

    /**
     * @dev Upgrades the implementation of the proxy
     * @param _newImplementation Address of the new implementation
     */
    function upgradeTo(address _newImplementation) external payable {
        if (msg.sender != owner) revert NotAuthorized();
        if (_newImplementation == address(0)) revert ImplementationInvalid();

        // solhint-disable-next-line no-inline-assembly
        assembly {
            sstore(ERC1967_IMPLEMENTATION_SLOT, _newImplementation)
        }

        emit Upgraded(_newImplementation);
    }

    function factory() external view override returns (address) {
        return _factory;
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    fallback() external payable {
        emit Received(msg.sender, msg.value);
    }

    /**
     * @dev Sets the root validator for this account
     * @param _validator Address of the validator
     */
    function setRootValidator(address _validator) external {
        if (_validator == address(0)) revert InvalidValidator();
        if (msg.sender != owner) revert NotAuthorized();

        rootValidator = _validator;
        emit RootValidatorChanged(_validator);
    }

    /**
     * @dev Adds a validator to the approved list
     * @param _validator Address of the validator to add
     */
    function addValidator(address _validator) external {
        if (_validator == address(0)) revert InvalidValidator();
        if (msg.sender != owner) revert NotAuthorized();

        approvedValidators[_validator] = true;
        emit ValidatorAdded(_validator);
    }

    /**
     * @dev Removes a validator from the approved list
     * @param _validator Address of the validator to remove
     */
    function removeValidator(address _validator) external {
        if (msg.sender != owner) revert NotAuthorized();

        approvedValidators[_validator] = false;
        emit ValidatorRemoved(_validator);
    }

    /**
     * @dev Implementation of validateHappyTx from IHappyAccount
     * Validates the transaction before execution
     */
    function validateHappyTx(bytes calldata encodedHappyTx) public override returns (bytes4) {
        HappyTx memory happyTx = HappyTxLib.decode(encodedHappyTx);

        // Check if validator is approved
        address validator = happyTx.validator;
        if (validator != address(0)) {
            if (validator != rootValidator && !approvedValidators[validator]) {
                revert ValidatorNotApproved();
            }

            bytes32 hash = HappyTxLib.getHappyTxHash(happyTx);

            try IHappyValidator(validator).validate(happyTx, hash) returns (bytes4 result) {
                return result;
            } catch (bytes memory revertData) {
                revert AccountValidationReverted(revertData);
            }
        }

        // If no validator specified, use root validator if set
        if (rootValidator != address(0)) {
            bytes32 hash = HappyTxLib.getHappyTxHash(happyTx);
            return IHappyValidator(rootValidator).validate(happyTx, hash);
        }

        // Fallback to internal validation
        return _internalValidate(happyTx.validationData);
    }

    /**
     * @dev Internal validation function to be overridden by derived contracts
     * @param validationData The data to validate against
     * @return A bytes4 selector: 0 for success, error selector for failure
     */
    function _internalValidate(bytes memory validationData) internal virtual returns (bytes4) {
        (validationData);
        return bytes4(0);
    }

    function execute(bytes calldata encodedHappyTx) external override nonReentrant returns (uint256) {
        uint256 startGas = gasleft();

        HappyTx memory happyTx = HappyTxLib.decode(encodedHappyTx);

        // Basic validation
        if (tx.gasprice > happyTx.maxFeePerGas) revert GasPriceTooHigh();
        if (happyTx.account != address(this)) revert WrongAccount();

        // Nonce validation
        if (!_validateAndUpdateNonce(happyTx.nonceTrack, happyTx.nonce)) {
            revert InvalidNonce();
        }

        // Validation phase
        bytes4 result = validateHappyTx(encodedHappyTx);
        bool isSimulation = tx.origin == address(0); // solhint-disable-line avoid-tx-origin
        if (!isSimulation && result != 0) revert AccountValidationFailed(result);

        // Balance check
        uint256 maxCost = happyTx.gasLimit * block.basefee;
        uint256 currentBalance = address(this).balance;

        if (happyTx.paymaster == address(0)) {
            if (currentBalance < maxCost) {
                revert AccountBalanceInsufficient();
            }
        } else {
            uint256 paymasterBalance = address(happyTx.paymaster).balance;
            if (paymasterBalance < maxCost) {
                revert PaymasterBalanceInsufficient();
            }

            try IHappyPaymaster(happyTx.paymaster).validatePaymaster(happyTx) returns (bytes4 _result) {
                if (!isSimulation && _result != 0) {
                    revert PaymasterValidationFailed(_result);
                }
            } catch (bytes memory revertData) {
                revert PaymasterValidationReverted(revertData);
            }
        }

        // Execute the call
        (bool success, bytes memory returnData) = happyTx.dest.call{value: happyTx.value}(happyTx.callData);

        if (!success) {
            emit CallReverted(returnData);
        }

        // Gas payment handling
        uint256 actualCost = startGas - gasleft() + INTRINSIC_GAS
            + CALLDATA_GAS_PER_BYTE * (encodedHappyTx.length + CALLDATA_LENGTH_ADJUSTMENT);

        if (actualCost > happyTx.gasLimit) actualCost = happyTx.gasLimit;

        if (happyTx.paymaster == address(0)) {
            currentBalance = address(this).balance; // Re-read balance after execution
            uint256 available = currentBalance > actualCost ? actualCost : currentBalance;
            (bool paySuccess,) = payable(tx.origin).call{value: available}(""); // solhint-disable-line avoid-tx-origin
            if (!paySuccess) revert AccountPaymentFailed();
            if (available < actualCost) {
                revert AccountPaymentCameShort(actualCost - available);
            }
        } else {
            uint256 balance = address(tx.origin).balance; // solhint-disable-line avoid-tx-origin
            uint256 gasBeforePayout = gasleft();
            try IHappyPaymaster(happyTx.paymaster).payout(happyTx, actualCost) returns (bool paySuccess) {
                if (!paySuccess) revert PaymasterPaymentFailed();
                uint256 payoutGasCost = gasBeforePayout - gasleft();
                uint256 balance2 = address(tx.origin).balance; // solhint-disable-line avoid-tx-origin
                if (balance2 < balance + actualCost + payoutGasCost) {
                    revert PaymasterPaymentCameShort(balance + actualCost - balance2);
                }
            } catch (bytes memory revertData) {
                revert PaymasterValidationReverted(revertData);
            }
        }

        return startGas - gasleft() + GAS_OVERHEAD_BUFFER;
    }
}
