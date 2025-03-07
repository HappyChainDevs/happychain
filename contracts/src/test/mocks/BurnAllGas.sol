// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

/// Contract that burns all gas available. Used for testing.
/// @dev This contract is not expected to be deployed.
contract BurnAllGas {
    function burnAllGas() public pure {
        while (true) {}
    }
}
