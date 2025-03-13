// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "oz-upgradeable/access/OwnableUpgradeable.sol";

import {IPaymaster} from "account-abstraction/contracts/interfaces/IPaymaster.sol";
import {IEntryPoint} from "account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {PackedUserOperation, UserOperationLib} from "account-abstraction/contracts/core/UserOperationLib.sol";

/**
 * Helper class for creating a paymaster.
 * provides helper methods for staking.
 * Validates that the postOp is called only by the entryPoint.
 *
 * Copied from BasePaymaster contract in eth-infinitism:
 * [Source](https://github.com/eth-infinitism/account-abstraction/blob/releases/v0.7/contracts/core/BasePaymaster.sol)
 * Modified to be an upgradeable proxy UUPS.
 *
 * The following changes were made to the original code:
 * - upgraded from Ownable to OwnableUpgradeable.
 * - implemented Openzeppelin's UUPSUPgradeable module.
 * - added reserve space of 50 * 256 byte slots for future upgrades.
 * - added an _initBasePaymaster (initializer) function instead of using a constructor.
 */
abstract contract BasePaymaster is IPaymaster, OwnableUpgradeable, UUPSUpgradeable {
    IEntryPoint public entryPoint;

    uint256 internal constant PAYMASTER_VALIDATION_GAS_OFFSET = UserOperationLib.PAYMASTER_VALIDATION_GAS_OFFSET;
    uint256 internal constant PAYMASTER_POSTOP_GAS_OFFSET = UserOperationLib.PAYMASTER_POSTOP_GAS_OFFSET;
    uint256 internal constant PAYMASTER_DATA_OFFSET = UserOperationLib.PAYMASTER_DATA_OFFSET;

    /// @dev Current version of the contract
    uint8 public version;

    function _initBasePaymaster(IEntryPoint _entryPoint, address _owner) internal onlyInitializing {
        _validateEntryPointInterface(_entryPoint);
        entryPoint = _entryPoint;
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        version = 1;
    }

    /// @notice Function that authorizes an upgrade of this contract via the UUPS proxy pattern
    /// @param newImplementation The address of the new implementation contract
    /// @dev Only callable by the owner
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;

    //sanity check: make sure this EntryPoint was compiled against the same
    // IEntryPoint of this paymaster
    function _validateEntryPointInterface(IEntryPoint _entryPoint) internal virtual {
        require(
            IERC165(address(_entryPoint)).supportsInterface(type(IEntryPoint).interfaceId),
            "IEntryPoint interface mismatch"
        );
    }

    /// @inheritdoc IPaymaster
    function validatePaymasterUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 maxCost)
        external
        override
        returns (bytes memory context, uint256 validationData)
    {
        _requireFromEntryPoint();
        return _validatePaymasterUserOp(userOp, userOpHash, maxCost);
    }

    /**
     * Validate a user operation.
     * @param userOp     - The user operation.
     * @param userOpHash - The hash of the user operation.
     * @param maxCost    - The maximum cost of the user operation.
     */
    function _validatePaymasterUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 maxCost)
        internal
        virtual
        returns (bytes memory context, uint256 validationData);

    /// @inheritdoc IPaymaster
    function postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost, uint256 actualUserOpFeePerGas)
        external
        override
    {
        _requireFromEntryPoint();
        _postOp(mode, context, actualGasCost, actualUserOpFeePerGas);
    }

    /**
     * Post-operation handler.
     * (verified to be called only through the entryPoint)
     * @dev If subclass returns a non-empty context from validatePaymasterUserOp,
     *      it must also implement this method.
     * @param mode          - Enum with the following options:
     *                        opSucceeded - User operation succeeded.
     *                        opReverted  - User op reverted. The paymaster still has to pay for gas.
     *                        postOpReverted - never passed in a call to postOp().
     * @param context       - The context value returned by validatePaymasterUserOp
     * @param actualGasCost - Actual gas used so far (without this postOp call).
     * @param actualUserOpFeePerGas - the gas price this UserOp pays. This value is based on the UserOp's maxFeePerGas
     *                        and maxPriorityFee (and basefee)
     *                        It is not the same as tx.gasprice, which is what the bundler pays.
     */
    function _postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost, uint256 actualUserOpFeePerGas)
        internal
        virtual
    {
        (mode, context, actualGasCost, actualUserOpFeePerGas); // unused params
        // subclass must override this method if validatePaymasterUserOp returns a context
        revert("must override");
    }

    /**
     * Add a deposit for this paymaster, used for paying for transaction fees.
     */
    function deposit() public payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    /**
     * Withdraw value from the deposit.
     * @param withdrawAddress - Target to send to.
     * @param amount          - Amount to withdraw.
     */
    function withdrawTo(address payable withdrawAddress, uint256 amount) public onlyOwner {
        entryPoint.withdrawTo(withdrawAddress, amount);
    }

    /**
     * Add stake for this paymaster.
     * This method can also carry eth value to add to the current stake.
     * @param unstakeDelaySec - The unstake delay for this paymaster. Can only be increased.
     */
    function addStake(uint32 unstakeDelaySec) external payable onlyOwner {
        entryPoint.addStake{value: msg.value}(unstakeDelaySec);
    }

    /**
     * Return current paymaster's deposit on the entryPoint.
     */
    function getDeposit() public view returns (uint256) {
        return entryPoint.balanceOf(address(this));
    }

    /**
     * Unlock the stake, in order to withdraw it.
     * The paymaster can't serve requests once unlocked, until it calls addStake again
     */
    function unlockStake() external onlyOwner {
        entryPoint.unlockStake();
    }

    /**
     * Withdraw the entire paymaster's stake.
     * stake must be unlocked first (and then wait for the unstakeDelay to be over)
     * @param withdrawAddress - The address to send withdrawn value.
     */
    function withdrawStake(address payable withdrawAddress) external onlyOwner {
        entryPoint.withdrawStake(withdrawAddress);
    }

    /**
     * Validate the call is made from a valid entrypoint
     */
    function _requireFromEntryPoint() internal virtual {
        require(msg.sender == address(entryPoint), "Sender not EntryPoint");
    }
}
