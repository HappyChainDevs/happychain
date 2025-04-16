// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Initializable} from "oz-upgradeable/proxy/utils/Initializable.sol";
import {DeployL1} from "src/deploy/DeployL1.s.sol";
import {DeployL1Upgradeable} from "src/deploy/DeployL1Upgradeable.s.sol";
import {HappyERC20} from "src/HappyERC20.sol";
import {HappyERC20Upgradeable} from "src/HappyERC20Upgradeable.sol";
import {HappyERC20Upgraded} from "src/test/HappyERC20Upgraded.sol";

contract HappyERC20Test is Test {
    DeployL1 private l1Deployment;
    DeployL1Upgradeable private l1DeploymentUpgradeable;
    HappyERC20 private happyERC20;
    HappyERC20Upgradeable private uHappyERC20;

    /// @dev Expected initial token supply, must match HappyERC20.sol.
    uint256 private constant INITIAL_SUPPLY = 10_000_000_000 ether;

    // =============================================================================================

    function setUp() public {
        l1Deployment = new DeployL1();
        l1Deployment.dontOutput();
        l1Deployment.run();
        happyERC20 = l1Deployment.happyERC20();

        l1DeploymentUpgradeable = new DeployL1Upgradeable();
        l1DeploymentUpgradeable.dontOutput();
        l1DeploymentUpgradeable.run();
        uHappyERC20 = l1DeploymentUpgradeable.happyERC20Proxy();
    }

    // =============================================================================================

    /**
     * @dev Test that the initial supply and token owner are as expected on the non-upgradeable
     * version of the token.
     */
    function testInitialSupplyAndOwner() public view {
        assertEq(happyERC20.totalSupply(), INITIAL_SUPPLY);

        // Assumes the msg.sender of this test function is the same as the msg.sender deploying the
        // contract, which is the case when using foundry.
        assertEq(happyERC20.balanceOf(address(msg.sender)), INITIAL_SUPPLY);
        assertEq(happyERC20.owner(), address(msg.sender));
    }

    // =============================================================================================

    /**
     * @dev Test that the initial supply and token owner are as expected on the upgradeable
     * version of the token.
     */
    function testInitialSupplyAndOwnerUpgradeable() public view {
        assertEq(uHappyERC20.totalSupply(), INITIAL_SUPPLY);

        // Assumes the msg.sender of this test function is the same as the msg.sender deploying the
        // contract, which is the case when using foundry.
        assertEq(uHappyERC20.balanceOf(address(msg.sender)), INITIAL_SUPPLY);
        assertEq(uHappyERC20.owner(), address(msg.sender));
    }

    // =============================================================================================

    /**
     * @dev Test that the contract can successfully be upgraded.
     */
    function testUpgrade() public {
        address happyERC20Upgraded = address(new HappyERC20Upgraded());
        vm.prank(msg.sender);
        uHappyERC20.upgradeToAndCall(
            happyERC20Upgraded, abi.encodeWithSelector(HappyERC20Upgraded.reinitialize.selector)
        );
        assertEq(HappyERC20Upgraded(address(uHappyERC20)).addedField(), "Chow is my love monkey");

        // Make sure the reinitialize function can't be called again.
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        HappyERC20Upgraded(address(uHappyERC20)).reinitialize();

        // Does the functionality still work?
        testInitialSupplyAndOwnerUpgradeable();
    }

    // =============================================================================================
}
