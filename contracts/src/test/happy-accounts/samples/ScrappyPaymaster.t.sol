// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {MockERC20Token} from "../../../mocks/MockERC20.sol";
import {HappyTxTestUtils} from "../Utils.sol";

import {ScrappyPaymaster} from "../../../happy-accounts/samples/ScrappyPaymaster.sol";

contract ScrappyPaymasterTest is Test {
    // ====================================================================================================
    // CONSTANTS

    address private constant STUB_ENTRYPOINT_ADDRESS = address(1);
    uint256 private constant PM_SUBMITTER_TIP_PER_BYTE = 2 gwei;
    uint256 private constant PM_DEPOSIT = 10 ether;

    // ====================================================================================================
    // STATE VARIABLES

    HappyTxTestUtils private utils;
    MockERC20Token private mockToken;
    ScrappyPaymaster private paymaster;

    address private owner;
    uint256 private privKey;

    function setUp() public {
        // Get the owner's private key and the address
        privKey = uint256(vm.envBytes32("PRIVATE_KEY_LOCAL"));
        owner = vm.addr(privKey);

        // Set up the utils
        utils = new HappyTxTestUtils();

        // Deploy the paymaster
        paymaster = new ScrappyPaymaster(STUB_ENTRYPOINT_ADDRESS, PM_SUBMITTER_TIP_PER_BYTE, owner);

        // Fund the paymaster
        vm.deal(address(paymaster), PM_DEPOSIT);

        // Deploy a mock ERC20 token
        mockToken = new MockERC20Token("MockTokenA", "MTA", uint8(18));
    }

    // ====================================================================================================
    // TESTS
}
