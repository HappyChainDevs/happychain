// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyTx} from "../HappyTx.sol";

/**
 * @title  HappyHelpers
 * @dev    Common utility functions for the Happy Account system
 */
library HappyHelpers {
    /**
     * @dev Computes the hash of a HappyTx for signing
     * @param happyTx The transaction to hash
     * @return The hash to sign
     */
    function getHappyTxHash(HappyTx memory happyTx) internal view returns (bytes32) {
        return keccak256(
            abi.encodePacked( // TODO: Update to use MUD encoding, then hash with keccak
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
    }

    /**
     * @dev Estimates the gas needed for a transaction
     * @param happyTx The transaction to estimate
     * @return The estimated gas required to execute the HappyTx
     */
    function estimateGas(HappyTx memory happyTx) internal pure returns (uint256) {
        // Base cost
        uint256 gas = 21000;

        // Add cost for calldata
        for (uint256 i = 0; i < happyTx.callData.length; i++) {
            gas += happyTx.callData[i] == 0 ? 4 : 16;
        }

        // Add validation cost if validator present
        if (happyTx.validator != address(0)) {
            gas += 40000; // Approximate validation cost
        }

        // Add paymaster cost if present
        if (happyTx.paymaster != address(0)) {
            gas += 40000; // Approximate paymaster cost
        }

        return gas;
    }

    /**
     * @dev Checks if an address is a contract
     * @param addr The address to check
     * @return True if the address is a contract
     */
    function isContract(address addr) internal view returns (bool) {
        uint256 size;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }

    /**
     * @dev Extracts the function selector from calldata
     * @param data The calldata to extract from
     * @return The function selector
     */
    function getSelector(bytes memory data) internal pure returns (bytes4) {
        if (data.length < 4) return bytes4(0);
        return bytes4(data[0]); // Dummy impl
    }
}
