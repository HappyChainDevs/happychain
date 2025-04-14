// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {HappyAccountBeacon} from "boop/happychain/HappyAccountBeacon.sol";
import {MockERC20} from "../../../mocks/MockERC20.sol";
import {DeployBoopContracts} from "../../../deploy/DeployBoop.s.sol";
import {Boop} from "boop/interfaces/Types.sol";
import {Encoding} from "../../../boop/core/Encoding.sol";
import {HappyAccount} from "boop/happychain/HappyAccount.sol";
import {HappyAccountBeaconFactory} from "boop/happychain/factories/HappyAccountBeaconFactory.sol";
import {BoopTestUtils} from "../Utils.sol";

contract UpgradeHappyAccountBeaconProxy is Test, BoopTestUtils {
    using Encoding for Boop;
    using MessageHashUtils for bytes32;

    // ====================================================================================================
    // CONSTANTS
    bytes32 private constant ERC1967_BEACON_SLOT = 0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50;
    bytes32 private constant SALT = 0;
    uint256 private constant DEPOSIT = 10 ether;

    // ====================================================================================================
    // STATE VARIABLES
    HappyAccountBeaconFactory private happyAccountFactory;
    HappyAccountBeacon private accountBeacon;
    HappyAccount private happyAccountImpl;

    address private smartAccount;
    address private mockToken;
    address private newImpl;
    uint256 private privKey;
    address private owner;

    // ====================================================================================================
    // COMMON TEST SETUP

    function setUp() public {
        privKey = uint256(vm.envBytes32("PRIVATE_KEY_LOCAL"));
        owner = vm.addr(privKey);

        // Set up the Deployment Script
        DeployBoopContracts deployer = new DeployBoopContracts();

        // Deploy the boop contracts as foundry-account-0
        vm.prank(owner);
        deployer.deployForTests();

        happyAccountFactory = deployer.happyAccountBeaconFactory();
        entryPoint = deployer.entryPoint();
        accountBeacon = deployer.happyAccountBeacon();
        happyAccountImpl = deployer.happyAccountImpl();

        // Deploy and initialize the proxy for scrappy account
        smartAccount = happyAccountFactory.createAccount(SALT, owner);

        // Deploy the new implementation
        newImpl = address(new HappyAccount(address(entryPoint)));

        // Deploy a mock ERC20 token
        mockToken = address(new MockERC20("MockTokenA", "MTA", uint8(18)));

        // Fund the smart account
        vm.deal(smartAccount, DEPOSIT);
    }

    // ====================================================================================================
    // TEST TO UPGRADE IMPL OF HAPPY ACCOUNT

    /// @dev Test upgradeability vai beacon
    function testUpgradeImplForSmartAccountViaBeacon() public {
        // Beacon slot should point to the beacon address
        bytes32 beacon = vm.load(smartAccount, ERC1967_BEACON_SLOT);
        assertEq(beacon, bytes32(uint256(uint160(address(accountBeacon)))), "Initial implementation not set correctly");

        // Beacon should point to the implementation
        assertEq(accountBeacon.implementation(), address(happyAccountImpl));

        // Account should be able to mint tokens
        Boop memory mintTx = createSignedBoopForMintToken(smartAccount, owner, smartAccount, mockToken, privKey);
        entryPoint.submit(mintTx.encode());
        assertEq(MockERC20(mockToken).balanceOf(owner), TOKEN_MINT_AMOUNT, "Mint operation failed");

        // non owner cannot upgrade via beacon
        vm.expectRevert();
        accountBeacon.upgradeTo(newImpl);

        // Beacon is upgradable only by the owner
        vm.prank(owner);
        accountBeacon.upgradeTo(newImpl);
        assertEq(accountBeacon.implementation(), newImpl, "Upgraded implementation not set correctly");

        // Verify beacon address is constant
        bytes32 updatedImpl = vm.load(smartAccount, ERC1967_BEACON_SLOT);
        assertEq(beacon, updatedImpl, "Implementation not updated correctly");

        // Create and submit mint transaction to verify new implementation works
        uint256 oldBalance = MockERC20(mockToken).balanceOf(owner);
        Boop memory mintTx2 = createSignedBoopForMintToken(smartAccount, owner, smartAccount, mockToken, privKey);
        entryPoint.submit(mintTx2.encode());

        // Verify mint was successful
        assertEq(MockERC20(mockToken).balanceOf(owner), (oldBalance + TOKEN_MINT_AMOUNT), "Mint operation failed");
    }
}
