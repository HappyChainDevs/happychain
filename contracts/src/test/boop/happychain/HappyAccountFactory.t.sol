// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {HappyAccountBeaconProxyFactory} from "boop/happychain/factories/HappyAccountBeaconProxyFactory.sol";
import {HappyAccountFactoryBase} from "boop/happychain/factories/HappyAccountFactoryBase.sol";
import {HappyAccount} from "boop/happychain/HappyAccount.sol";
import {HappyAccountBeacon} from "boop/happychain/HappyAccountBeacon.sol";
import {HappyAccountRegistry} from "boop/happychain/HappyAccountRegistry.sol";
import {Test} from "forge-std/Test.sol";

contract HappyAccountFactoryTest is Test {
    bytes32 private constant DEPLOYMENT_SALT = bytes32(uint256(0));
    bytes32 private constant DEPLOYMENT_SALT2 = bytes32(uint256(1));
    address private constant STUB_ENTRYPOINT_ADDRESS = address(1);
    address private constant OWNER = address(0xdead);
    address private constant OWNER2 = address(0xbeef);

    HappyAccountBeaconProxyFactory private factory;
    HappyAccount private implementation;
    HappyAccountBeacon private accountBeacon;
    HappyAccountRegistry private happyAccountRegistry;

    function setUp() public {
        happyAccountRegistry = new HappyAccountRegistry();
        implementation = new HappyAccount(STUB_ENTRYPOINT_ADDRESS);
        accountBeacon = new HappyAccountBeacon(address(implementation), address(this));
        factory = new HappyAccountBeaconProxyFactory(address(accountBeacon), address(happyAccountRegistry));
        vm.prank(tx.origin);
        happyAccountRegistry.setAuthorizedFactory(address(factory), true);
    }

    function testInitialDeployment() public {
        // Get predicted address and verify no code exists there yet
        address predicted = factory.getAddress(DEPLOYMENT_SALT, OWNER);
        assertFalse(_hasCode(predicted), "No code should exist at predicted address before deployment");

        // Deploy and verify
        address deployed = factory.createAccount(DEPLOYMENT_SALT, OWNER);
        assertTrue(_hasCode(deployed), "Code should exist at deployed address");

        // check present in registry
        assertEq(happyAccountRegistry.registeredAccounts(deployed), address(factory), "Account should be registered");

        // Verify predicted and deployed addresses match
        assertEq(predicted, deployed, "Predicted address should match deployed address");

        // Verify account is owned by the expected owner
        assertEq(_getOwner(deployed), OWNER, "Owner should be set correctly");
    }

    function testRedeploymentReverts() public {
        // First deployment
        factory.createAccount(DEPLOYMENT_SALT, OWNER);

        // Try to deploy again with same salt and owner - should revert
        vm.expectRevert(HappyAccountFactoryBase.AlreadyDeployed.selector);
        factory.createAccount(DEPLOYMENT_SALT, OWNER);
    }

    function testDifferentOwnersWithSameSalt() public {
        // Deploy first account
        address firstDeployed = factory.createAccount(DEPLOYMENT_SALT, OWNER);

        // Deploy second account with different owner but same salt
        address secondDeployed = factory.createAccount(DEPLOYMENT_SALT, OWNER2);

        // Verify different addresses due to owner being part of salt
        assertNotEq(firstDeployed, secondDeployed, "Deployments with different owners should have different addresses");

        // Verify both accounts are owned by the expected owners
        assertEq(_getOwner(firstDeployed), OWNER, "First account should be owned by OWNER");
        assertEq(_getOwner(secondDeployed), OWNER2, "Second account should be owned by OWNER2");
    }

    function testSameOwnerWithDifferentSalts() public {
        // Deploy first account with salt 0
        address firstDeployed = factory.createAccount(DEPLOYMENT_SALT, OWNER);

        // Deploy second account with same owner but different salt
        address secondDeployed = factory.createAccount(DEPLOYMENT_SALT2, OWNER);

        // Verify different addresses due to different salts
        assertNotEq(firstDeployed, secondDeployed, "Deployments with different salts should have different addresses");

        // Verify both accounts are owned by the same owner
        assertEq(_getOwner(firstDeployed), _getOwner(secondDeployed), "Both accounts should be owned by OWNER");
    }

    // solhint-disable-next-line func-name-mixedcase
    function test_fuzz_NoLeading0xEF(address owner, bytes32 salt) public {
        vm.assume(owner != address(0));
        // skip if already deployed
        address predicted = factory.getAddress(salt, owner);
        vm.assume(!_hasCode(predicted));

        address deployed = factory.createAccount(salt, owner);

        // invariants
        bytes memory code = deployed.code;
        assertGt(code.length, 0, "deployed contract must have code");
        // EIP-3541 guard: first byte must not be 0xEF
        assertTrue(uint8(code[0]) != 0xef, "byte-code starts with 0xEF");
    }

    // ====================================================================================================
    // HELPER FUNCTIONS

    /// @dev Helper function to check if code exists at an address
    function _hasCode(address addr) internal view returns (bool) {
        return addr.code.length > 0;
    }

    /// @dev Helper function to get the owner of an account
    function _getOwner(address account) internal view returns (address) {
        return HappyAccount(payable(account)).owner();
    }
}
