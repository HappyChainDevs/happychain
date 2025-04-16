// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {MockERC20} from "../../../mocks/MockERC20.sol";
import {DeployBoopContracts} from "../../../deploy/DeployBoop.s.sol";
import {Boop} from "boop/interfaces/Types.sol";
import {Encoding} from "../../../boop/core/Encoding.sol";
import {HappyAccount} from "boop/happychain/HappyAccount.sol";
import {HappyAccountUUPSProxy} from "boop/happychain/HappyAccountUUPSProxy.sol";
import {HappyAccountUUPSProxyFactory} from "boop/happychain/factories/HappyAccountUUPSProxyFactory.sol";
import {BoopTestUtils} from "../Utils.sol";

contract UpgradeHappyAccountUUPSProxyTest is Test, BoopTestUtils {
    using Encoding for Boop;
    using MessageHashUtils for bytes32;

    // ====================================================================================================
    // CONSTANTS

    bytes32 private constant ERC1967_IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    bytes32 private constant SALT = 0;
    uint256 private constant DEPOSIT = 10 ether;

    // ====================================================================================================
    // STATE VARIABLES

    HappyAccountUUPSProxyFactory private happyAccountFactory;

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

        happyAccountFactory = deployer.happyAccountUUPSProxyFactory();
        entryPoint = deployer.entryPoint();

        // Deploy and initialize the proxy for happy account
        smartAccount = happyAccountFactory.createAccount(SALT, owner);

        // Deploy the new implementation
        newImpl = address(new HappyAccountUUPSProxy(address(entryPoint)));

        // Deploy a mock ERC20 token
        mockToken = address(new MockERC20("MockTokenA", "MTA", uint8(18)));

        // Fund the smart account
        vm.deal(smartAccount, DEPOSIT);
    }

    // ====================================================================================================
    // TEST TO UPGRADE IMPL OF HAPPY ACCOUNT

    /// @dev Test upgradeability via a boop
    function testUpgradeImplForSmartAccountViaBoop() public {
        // Store the original implementation address
        bytes32 oldImpl = vm.load(smartAccount, ERC1967_IMPLEMENTATION_SLOT);

        // Create and submit upgrade transaction
        Boop memory upgradeBoop = createSignedBoop(
            smartAccount,
            smartAccount,
            smartAccount,
            privKey,
            abi.encodeCall(UUPSUpgradeable.upgradeToAndCall, (newImpl, ""))
        );
        entryPoint.submit(upgradeBoop.encode());

        // Verify implementation was updated
        bytes32 updatedImpl = vm.load(smartAccount, ERC1967_IMPLEMENTATION_SLOT);
        assertNotEq(oldImpl, updatedImpl, "Implementation not updated correctly");

        // Verify the implementation address points to the expected new implementation
        address implAddr = address(uint160(uint256(updatedImpl)));
        assertEq(implAddr, newImpl, "Implementation not updated correctly");

        // Create and submit mint transaction to verify new implementation works
        Boop memory mintBoop = createSignedBoopForMintToken(smartAccount, owner, smartAccount, mockToken, privKey);
        entryPoint.submit(mintBoop.encode());

        // Verify mint was successful
        assertEq(MockERC20(mockToken).balanceOf(owner), TOKEN_MINT_AMOUNT, "Mint operation failed");
    }

    /// @dev Test upgradeability via a vanilla ethereum tx
    function testUpgradeImplForSmartAccountViaEthereumTx() public {
        // Store the original implementation address
        bytes32 oldImpl = vm.load(smartAccount, ERC1967_IMPLEMENTATION_SLOT);

        // Create and submit upgrade transaction
        vm.prank(owner);
        HappyAccountUUPSProxy(payable(smartAccount)).upgradeToAndCall(newImpl, "");

        // Verify implementation was updated
        bytes32 updatedImpl = vm.load(smartAccount, ERC1967_IMPLEMENTATION_SLOT);
        assertNotEq(oldImpl, updatedImpl, "Implementation not updated correctly");

        // Verify the implementation address points to the expected new implementation
        address implAddr = address(uint160(uint256(updatedImpl)));
        assertEq(implAddr, newImpl, "Implementation not updated correctly");

        // Create and submit mint transaction to verify new implementation works
        Boop memory mintBoop = createSignedBoopForMintToken(smartAccount, owner, smartAccount, mockToken, privKey);
        entryPoint.submit(mintBoop.encode());

        // Verify mint was successful
        assertEq(MockERC20(mockToken).balanceOf(owner), TOKEN_MINT_AMOUNT, "Mint operation failed");
    }

    /// @dev Test that upgradeability fails when not called by owner or account
    function testUpgradeImplForSmartAccountViaEthereumTxFailsWhenNotOwner() public {
        // Store the original implementation address
        bytes32 oldImpl = vm.load(smartAccount, ERC1967_IMPLEMENTATION_SLOT);

        // Try to upgrade from a non-owner address
        address nonOwner = address(0xdead);
        vm.prank(nonOwner);

        // Expect revert when trying to upgrade
        vm.expectRevert(HappyAccount.NotSelfOrOwner.selector);
        HappyAccountUUPSProxy(payable(smartAccount)).upgradeToAndCall(newImpl, "");

        // Verify implementation was not updated
        bytes32 impl = vm.load(smartAccount, ERC1967_IMPLEMENTATION_SLOT);
        assertEq(impl, oldImpl, "Implementation should not have changed");
    }
}
