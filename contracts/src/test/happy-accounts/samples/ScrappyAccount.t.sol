// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {MockERC20} from "../../../mocks/MockERC20.sol";
import {HappyTxTestUtils} from "../Utils.sol";

import {ScrappyAccount} from "../../../happy-accounts/samples/ScrappyAccount.sol";
import {ScrappyAccountFactory} from "../../../happy-accounts/factories/ScrappyAccountFactory.sol";

contract ScrappyAccountTest is Test {
    // ====================================================================================================
    // CONSTANTS

    bytes32 private constant SALT = 0;
    uint256 private constant ACCOUNT_DEPOSIT = 10 ether;
    address private constant STUB_ENTRYPOINT_ADDRESS = address(1);

    // ====================================================================================================
    // STATE VARIABLES

    HappyTxTestUtils private utils;
    MockERC20 private mockToken;

    ScrappyAccount private scrappyAccount;
    ScrappyAccountFactory private scrappyAccountFactory;

    address private owner;
    uint256 private privKey;
    address private smartAccount;

    function setUp() public {
        // Get the owner's private key and the address
        privKey = uint256(vm.envBytes32("PRIVATE_KEY_LOCAL"));
        owner = vm.addr(privKey);

        // Set up the utils
        utils = new HappyTxTestUtils();

        // Deploy the scrappy account
        scrappyAccount = new ScrappyAccount(STUB_ENTRYPOINT_ADDRESS);
        scrappyAccountFactory = new ScrappyAccountFactory(address(scrappyAccount));
        smartAccount = scrappyAccountFactory.createAccount(SALT, owner);

        // Fund the smart account
        vm.deal(smartAccount, ACCOUNT_DEPOSIT);

        // Deploy a mock ERC20 token
        mockToken = new MockERC20("MockTokenA", "MTA", uint8(18));
    }

    // ====================================================================================================
    // TESTS
}
