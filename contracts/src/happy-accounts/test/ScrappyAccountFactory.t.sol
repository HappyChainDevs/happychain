// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {ScrappyAccount} from "../samples/ScrappyAccount.sol";
import {ScrappyAccountFactory} from "../factories/ScrappyAccountFactory.sol";

contract ScrappyAccountFactoryTest is Test {
    bytes32 private constant DEPLOYMENT_SALT = bytes32(uint256(0));
    bytes32 private constant DEPLOYMENT_SALT2 = bytes32(uint256(1));
    address private constant STUB_ENTRYPOINT_ADDRESS = address(1);
    address private constant OWNER = address(0xdead);
    address private constant OWNER2 = address(0xbeef);

    ScrappyAccountFactory private factory;
    ScrappyAccount private implementation;

    function setUp() public {
        implementation = new ScrappyAccount(STUB_ENTRYPOINT_ADDRESS);
        factory = new ScrappyAccountFactory(address(implementation));
    }

    function testInitialDeployment() public {
        // Get predicted address and verify no code exists there yet
        address predicted = factory.getAddress(DEPLOYMENT_SALT, OWNER);
        assertFalse(_hasCode(predicted), "No code should exist at predicted address before deployment");

        // Deploy and verify
        address deployed = factory.createAccount(DEPLOYMENT_SALT, OWNER);
        assertTrue(_hasCode(deployed), "Code should exist at deployed address");

        // Verify predicted and deployed addresses match
        assertEq(predicted, deployed, "Predicted address should match deployed address");

        // Verify account is owned by the expected owner
        assertEq(_getOwner(deployed), OWNER, "Owner should be set correctly");
    }

    function testRedeploymentReverts() public {
        // First deployment
        factory.createAccount(DEPLOYMENT_SALT, OWNER);

        // Try to deploy again with same salt and owner - should revert
        vm.expectRevert(ScrappyAccountFactory.AlreadyDeployed.selector);
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

    // ====================================================================================================
    // HELPER FUNCTIONS

    /// @dev Helper function to check if code exists at an address
    function _hasCode(address addr) internal view returns (bool) {
        return addr.code.length > 0;
    }

    /// @dev Helper function to get the owner of an account
    function _getOwner(address account) internal view returns (address) {
        return ScrappyAccount(payable(account)).owner();
    }
}
