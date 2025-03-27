// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ECDSA} from "solady/utils/ECDSA.sol";

import {HappyTx} from "boop/core/HappyTx.sol";
import {ICustomBoopValidator} from "boop/interfaces/extensions/ICustomBoopValidator.sol";
import {HappyTxLib} from "boop/libs/HappyTxLib.sol";
import {InvalidSignature} from "boop/utils/Common.sol";

/// Selector returned if trying to validate an account-paid boop with a session key.
error AccountPaidSessionKeyBoop();

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
contract SessionKeyValidator is ICustomBoopValidator {
    using ECDSA for bytes32;
    using HappyTxLib for HappyTx;

    // ====================================================================================================
    // EVENTS

    event SessionKeyAdded(address indexed account, address indexed target, address sessionKey);
    event SessionKeyRemoved(address indexed account, address indexed target);

    // ====================================================================================================
    // ERRORS

    /// @dev Security error: Prevents registering a session key for the validator itself
    error CannotRegisterSessionKeyForValidator();

    /// @dev Security error: Prevents an account from registering a session key for itself
    error CannotRegisterSessionKeyForAccount();

    // ====================================================================================================
    // IMMUTABLES AND STATE VARIABLES

    mapping(address account => mapping(address target => address sessionKey)) public sessionKeys;

    // ====================================================================================================
    // FUNCTIONS

    function addSessionKey(address target, address sessionKey) public {
        if (target == address(this)) revert CannotRegisterSessionKeyForValidator();
        if (target == msg.sender) revert CannotRegisterSessionKeyForAccount();

        sessionKeys[msg.sender][target] = sessionKey;
        emit SessionKeyAdded(msg.sender, target, sessionKey);
    }

    function addSessionKeys(address[] calldata target, address[] calldata sessionKey) external {
        for (uint256 i = 0; i < target.length; i++) {
            addSessionKey(target[i], sessionKey[i]);
        }
    }

    function removeSessionKey(address target) public {
        delete sessionKeys[msg.sender][target];
        emit SessionKeyRemoved(msg.sender, target);
    }

    function removeSessionKeys(address[] calldata target) external {
        for (uint256 i = 0; i < target.length; i++) {
            removeSessionKey(target[i]);
        }
    }

    function validate(HappyTx memory happyTx) external view returns (bytes memory) {
        if (happyTx.paymaster == happyTx.account) {
            return abi.encodeWithSelector(AccountPaidSessionKeyBoop.selector);
        }

        // The happyTx is not self-paying.
        // The signer does not sign over these fields to avoid extra network roundtrips
        // validation policy falls to the paymaster or the sponsoring submitter.
        happyTx.gasLimit = 0;
        happyTx.executeGasLimit = 0;
        happyTx.maxFeePerGas = 0;
        happyTx.submitterFee = 0;

        bytes memory signature = happyTx.validatorData;
        happyTx.validatorData = ""; // set to "" to get the hash
        address signer = keccak256(happyTx.encode()).toEthSignedMessageHash().recover(signature);

        address sessionKey = sessionKeys[msg.sender][happyTx.dest];
        bytes4 selector = signer == sessionKey ? bytes4(0) : bytes4(InvalidSignature.selector);
        return abi.encodeWithSelector(selector);
    }
}
