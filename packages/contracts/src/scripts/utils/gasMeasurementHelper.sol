// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {PackedUserOperation} from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {IPaymaster} from "account-abstraction/contracts/interfaces/IPaymaster.sol";

import {UserOpLib} from "../UserOpLib.sol";

// Helper Contract for Gas Measurement for Warm Storage Access
contract GasMeasurementHelper is Test {
    using UserOpLib for PackedUserOperation;

    /**
     * @notice Measures gas usage for validating multiple user operations within a single transaction.
     *
     * This contract is used to simulate warm storage access when tests are run with the `--isolate` flag.
     * By executing validations within the same transaction, storage slots remain warm between calls.
     *
     * @param happyPaymaster The paymaster contract to validate user operations.
     * @param userOps An array of `PackedUserOperation` to validate.
     * @param entryPointV7 The address of the EntryPointV7 contract.
     * @param requiredPrefund The required prefund amount for user operations.
     * @return gasUsedArray An array of gas used for each user operation validation.
     */
    function measureValidatePaymasterUserOpGas(
        IPaymaster happyPaymaster,
        PackedUserOperation[] memory userOps,
        address entryPointV7,
        uint256 requiredPrefund
    ) public returns (uint256[] memory) {
        uint256[] memory gasUsedArray = new uint256[](userOps.length);

        for (uint256 i = 0; i < userOps.length; i++) {
            PackedUserOperation memory userOp = userOps[i];
            bytes32 userOpHash = userOp.getEncodedUserOpHash();

            vm.prank(entryPointV7);
            uint256 gasBefore = gasleft();
            happyPaymaster.validatePaymasterUserOp(userOp, userOpHash, requiredPrefund);
            uint256 gasAfter = gasleft();

            gasUsedArray[i] = gasBefore - gasAfter;
        }

        return gasUsedArray;
    }
}
