// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../HappyTx.sol";

/**
 * @title  IHappyValidator
 * @dev    Interface for validating HappyTx transactions
 *         Validators can implement custom validation logic (signatures, permissions, etc.)
 */
interface IHappyValidator {
    /**
     * @dev Error when signature validation fails
     */
    error SignatureValidationFailed();

    /**
     * @dev Error when validation data is invalid or missing
     */
    error InvalidValidationData();

    /**
     * @dev Validates whether the happyTx is valid according to validator rules
     * @param happyTx The transaction to validate
     * @param hash The hash of the transaction data that was signed
     * @return validationResult A bytes4 selector: 0 for success, error selector for failure
     *         For signature validation: return SignatureValidationFailed.selector on failure
     */
    function validate(HappyTx calldata happyTx, bytes32 hash) external returns (bytes4 validationResult);
}
