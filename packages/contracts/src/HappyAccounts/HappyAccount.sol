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

    uint256 private constant INTRINSIC_GAS = 22000; // 21000 + 1000 for overhead

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

    event Upgraded(address indexed implementation);
    event Received(address sender, uint256 amount);
    event CallReverted(bytes returnData);

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
     * @dev Implementation of validateHappyTx from IHappyAccount
     * Validates the transaction before execution
     */
    function validateHappyTx(bytes calldata encodedHappyTx) public override returns (bytes4) {
        HappyTx memory happyTx = HappyTxLib.decode(encodedHappyTx);

        // If external validator is specified, use it
        if (happyTx.validator != address(0)) {
            // Hash the transaction data for signature validation
            bytes32 hash = keccak256(
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

            try IHappyValidator(happyTx.validator).validate(happyTx, hash) returns (bytes4 result) {
                return result;
            } catch (bytes memory revertData) {
                revert AccountValidationReverted(revertData);
            }
        }

        // Otherwise use internal validation
        return _internalValidate(happyTx.validationData);
    }

    /**
     * @dev Internal validation function to be overridden by derived contracts
     * @param validationData The data to validate against
     * @return A bytes4 selector: 0 for success, error selector for failure
     */
    function _internalValidate(bytes memory validationData) internal virtual returns (bytes4) {
        validationData; // Do remove "unused-param" warning (temp)
        return bytes4(0);
    }

    function execute(bytes calldata encodedHappyTx) external override nonReentrant returns (uint256) {
        // TODO: Implement this function properly, placeholder for now
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
        if (happyTx.paymaster == address(0)) {
            if (address(this).balance < maxCost) {
                revert AccountBalanceInsufficient();
            }
        } else {
            if (address(happyTx.paymaster).balance < maxCost) {
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
        uint256 actualCost = startGas - gasleft() + INTRINSIC_GAS + 16 * (encodedHappyTx.length + 4);

        if (actualCost > happyTx.gasLimit) actualCost = happyTx.gasLimit;

        if (happyTx.paymaster == address(0)) {
            uint256 balance = address(this).balance;
            uint256 available = balance > actualCost ? actualCost : balance;
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

        return startGas - gasleft() + 100;
    }
}
