// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ECDSA} from "solady/utils/ECDSA.sol";

import {HappyTxTestUtils} from "../Utils.sol";
import {MockERC20} from "../../../mocks/MockERC20.sol";

import {HappyTx} from "../../../happy-accounts/core/HappyTx.sol";
import {HappyTxLib} from "../../../happy-accounts/libs/HappyTxLib.sol";

import {DeployHappyAAContracts} from "../../../deploy/DeployHappyAA.s.sol";
import {ScrappyPaymaster} from "../../../happy-accounts/samples/ScrappyPaymaster.sol";

contract ScrappyPaymasterTest is HappyTxTestUtils {
    using HappyTxLib for HappyTx;
    using ECDSA for bytes32;

    // ====================================================================================================
    // CONSTANTS

    bytes32 private constant SALT = 0;
    bytes32 private constant SALT2 = bytes32(uint256(1));
    address private constant ZERO_ADDRESS = address(0);
    uint256 private constant INITIAL_DEPOSIT = 10 ether;

    // ====================================================================================================
    // STATE VARIABLES

    DeployHappyAAContracts private deployer;

    address private happyEntryPoint;
    address private smartAccount;
    address private mockToken;
    address private paymaster;
    uint256 private privKey;
    address private owner;
    address private dest;

    function setUp() public {
        privKey = uint256(vm.envBytes32("PRIVATE_KEY_LOCAL"));
        owner = vm.addr(privKey);

        // Set up the Deployment Script, and deploy the happy-aa contracts as foundry-account-0
        deployer = new DeployHappyAAContracts();
        vm.prank(owner);
        deployer.deployForTests();

        happyEntryPoint = address(deployer.happyEntryPoint());
        smartAccount = deployer.scrappyAccountFactory().createAccount(SALT, owner);

        dest = deployer.scrappyAccountFactory().createAccount(SALT2, owner);

        paymaster = address(deployer.scrappyPaymaster());

        // Fund the paymaster
        vm.deal(paymaster, INITIAL_DEPOSIT);

        // Deploy a mock ERC20 token
        mockToken = address(new MockERC20("MockTokenA", "MTA", uint8(18)));
    }

    // ====================================================================================================
    // TESTS
}
