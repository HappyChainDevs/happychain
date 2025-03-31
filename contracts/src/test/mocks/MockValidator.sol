// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "boop/core/HappyTx.sol";
import {ICustomBoopValidator} from "boop/interfaces/extensions/ICustomBoopValidator.sol";

/**
 * Mock implementation of ICustomBoopValidator for testing purposes.
 * The validation behavior depends on the validationMode:
 * 0: Approves all transactions (returns empty bytes)
 * 1: Rejects all transactions (returns a custom error selector)
 * 2: Reverts all transactions (with custom error)
 * 3: Reverts all transactions (empty revert)
 */
contract MockValidator is ICustomBoopValidator {
    // Validation mode
    uint256 public validationMode;

    // Custom error for revert mode
    error CustomErrorMockRevert();

    // Custom error for rejection mode
    error ValidationRejected();

    constructor() {
        validationMode = 0;
    }

    /**
     * Set the validation mode
     * @param _validationMode New validation mode (0=approve, 1=revert, 2=reject, 3=empty revert)
     */
    function setValidationMode(uint256 _validationMode) external {
        validationMode = _validationMode;
    }

    /**
     * Validate a transaction based on the current validation mode
     * The happyTx parameter is intentionally unused in this mock implementation
     * @return result The validation result
     */
    function validate(HappyTx memory /* happyTx */) external view returns (bytes memory) {
        if (validationMode == 0) {
            // Approve mode: return empty bytes
            return "";
        } else if (validationMode == 1) {
            // Reject mode: return a custom error selector
            return abi.encodeWithSelector(ValidationRejected.selector);
        } else if (validationMode == 2) {
            revert CustomErrorMockRevert();
        } else if (validationMode == 3) {
            // solhint-disable-next-line reason-string
            revert();
        }

        revert("MockValidator: invalid validation mode");
    }
}
