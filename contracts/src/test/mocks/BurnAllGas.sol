// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

/// Contract that burns all gas available. Used for testing.
/// @dev This contract is not expected to be deployed.
contract BurnAllGas {
    bytes32 private stor;

    /// Burns all available gas in the transaction
    /// @dev This implementation uses assembly to ensure the EVM cannot optimize away the gas consumption
    function burnAllGas() public {
        for (uint256 i = 0; i < 256; i++) {
            stor = keccak256(abi.encodePacked(gasleft(), stor));
            stor = 0;
        }
    }
}
