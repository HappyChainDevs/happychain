// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {PackedUserOperation} from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {IPaymaster} from "account-abstraction/contracts/interfaces/IPaymaster.sol";

import {UserOpLib} from "../UserOpLib.sol";

// Helper Contract for Gas Measurement for Warm Storage Access
contract GasMeasurementHelper is Test {
    using UserOpLib for PackedUserOperation;

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
