// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Encoding} from "boop/core/Encoding.sol";
import {Utils} from "boop/core/Utils.sol";
import {InvalidSignature} from "boop/interfaces/EventsAndErrors.sol";
import {ICustomValidator} from "boop/interfaces/ICustomValidator.sol";
import {Boop} from "boop/interfaces/Types.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";

/**
 * This validator maintains a mapping from (account, target) pair to session keys, and authorizes
 * boops from the given account to the target if they are signed with the session key.
 *
 * Only the account is abilitated to modify its own mappings.
 *
 * Session key validation is restricted to boops that are not paid for by the account itself,
 * as this opens a griefing vector where a malicious app destroys user funds by spamming, and
 * unlike paymasters and submitters, account are not usually set up to handle this.
 *
 * The session key is represented as an address (as that is the result of ecrecover), which is not
 * strictly speaking a key, but we call it that anyway for simplicity.
 */
contract SessionKeyValidator is ICustomValidator {
    using ECDSA for bytes32;
    using Encoding for Boop;

    // ====================================================================================================
    // EVENTS

    event SessionKeyAdded(address indexed account, address indexed target, address sessionKey);
    event SessionKeyRemoved(address indexed account, address indexed target, address sessionKey);

    // ====================================================================================================
    // ERRORS

    /// Selector returned if the transaction is trying to send non-zero value transaction
    error SessionKeyValueTransferNotAllowed();

    /// Selector returned if trying to validate an account-paid boop with a session key.
    error AccountPaidSessionKeyBoop();

    /// @dev Security error: Prevents registering a session key for the validator itself
    error CannotRegisterSessionKeyForValidator();

    /// @dev Security error: Prevents an account from registering a session key for itself
    error CannotRegisterSessionKeyForAccount();

    // ====================================================================================================
    // IMMUTABLES AND STATE VARIABLES

    mapping(address account => mapping(address target => mapping(address sessionKey => bool))) public sessionKeys;

    // ====================================================================================================
    // FUNCTIONS

    function addSessionKey(address target, address sessionKey) public {
        if (target == address(this)) revert CannotRegisterSessionKeyForValidator();
        if (target == msg.sender) revert CannotRegisterSessionKeyForAccount();

        sessionKeys[msg.sender][target][sessionKey] = true;
        emit SessionKeyAdded(msg.sender, target, sessionKey);
    }

    function addSessionKeys(address[] calldata target, address[] calldata sessionKey) external {
        for (uint256 i = 0; i < target.length; i++) {
            addSessionKey(target[i], sessionKey[i]);
        }
    }

    function removeSessionKey(address target, address sessionKey) public {
        delete sessionKeys[msg.sender][target][sessionKey];
        emit SessionKeyRemoved(msg.sender, target, sessionKey);
    }

    function removeSessionKeys(address[] calldata targets, address[] calldata keys) external {
        require(targets.length == keys.length, "Array lengths must match");
        for (uint256 i = 0; i < targets.length; i++) {
            removeSessionKey(targets[i], keys[i]);
        }
    }

    function validate(Boop memory boop) external view returns (bytes memory) {
        if (boop.value > 0) {
            return abi.encodeWithSelector(SessionKeyValueTransferNotAllowed.selector);
        }

        if (boop.payer == boop.account) {
            return abi.encodeWithSelector(AccountPaidSessionKeyBoop.selector);
        }

        bytes memory signature = boop.validatorData;
        address signer = Utils.computeBoopHash(boop, false).tryRecover(signature);

        bool isValidSessionKey = sessionKeys[msg.sender][boop.dest][signer];
        bytes4 selector = isValidSessionKey ? bytes4(0) : bytes4(InvalidSignature.selector);
        return abi.encodeWithSelector(selector);
    }
}
