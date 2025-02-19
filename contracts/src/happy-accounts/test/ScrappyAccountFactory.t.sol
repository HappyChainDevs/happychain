// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {ScrappyAccount} from "../samples/ScrappyAccount.sol";
import {ScrappyAccountFactory} from "../factories/ScrappyAccountFactory.sol";

contract ScrappyAccountFactoryTest is Test {
    bytes32 private constant DEPLOYMENT_SALT = 0;
    address private constant STUB_ENTRYPOINT_ADDRESS = address(0x0000000000000000000000000000000000000001);
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
        address deployed = _deployAndVerifyAccount(DEPLOYMENT_SALT, OWNER);
        assertTrue(_hasCode(deployed), "Code should exist at deployed address");
    }

    function testRedeploymentReverts() public {
        // First deployment
        _deployAndVerifyAccount(DEPLOYMENT_SALT, OWNER);

        // Try to deploy again with same salt and owner - should revert
        vm.expectRevert(ScrappyAccountFactory.AlreadyDeployed.selector);
        factory.createAccount(DEPLOYMENT_SALT, OWNER);
    }

    function testDifferentOwnersWithSameSalt() public {
        // Deploy first account
        address firstDeployed = _deployAndVerifyAccount(DEPLOYMENT_SALT, OWNER);

        // Deploy second account with different owner but same salt
        address secondDeployed = _deployAndVerifyAccount(DEPLOYMENT_SALT, OWNER2);

        // Verify different addresses due to owner being part of salt
        assertNotEq(firstDeployed, secondDeployed, "Deployments with different owners should have different addresses");
    }

    // ====================================================================================================
    // HELPER FUNCTIONS

    /// @dev Helper function to check if code exists at an address
    function _hasCode(address addr) internal view returns (bool) {
        return addr.code.length > 0;
    }

    /// @dev Helper function to deploy and verify basic account properties
    function _deployAndVerifyAccount(bytes32 salt, address owner) internal returns (address) {
        address predicted = factory.getAddress(salt, owner);
        address deployed = factory.createAccount(salt, owner);

        assertEq(predicted, deployed, "Predicted address should match deployed address");
        assertEq(ScrappyAccount(payable(deployed)).owner(), owner, "Owner should be set correctly");

        return deployed;
    }
}
