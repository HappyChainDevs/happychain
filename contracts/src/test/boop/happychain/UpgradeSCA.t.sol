// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {MockERC20} from "../../../mocks/MockERC20.sol";
import {DeployBoopContracts} from "../../../deploy/DeployBoop.s.sol";

import {EntryPoint} from "boop/core/EntryPoint.sol";
import {Boop} from "boop/core/Boop.sol";
import {HappyAccountFactory} from "boop/happychain/HappyAccountFactory.sol";
import {BoopLib} from "boop/libs/BoopLib.sol";
import {HappyAccount} from "boop/happychain/HappyAccount.sol";

contract UpgradeSCATest is Test {
    using BoopLib for Boop;
    using MessageHashUtils for bytes32;

    // ====================================================================================================
    // CONSTANTS

    bytes32 private constant ERC1967_IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    bytes32 private constant SALT = 0;
    uint256 private constant DEPOSIT = 10 ether;
    uint256 private constant MINT_AMOUNT = 5 ether;

    // ====================================================================================================
    // STATE VARIABLES

    HappyAccountFactory private happyAccountFactory;
    EntryPoint private entryPoint;

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

        happyAccountFactory = deployer.happyAccountFactory();
        entryPoint = deployer.entryPoint();

        // Deploy and initialize the proxy for happy account
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

    /// @dev Test upgradeability via a boop
    function testUpgradeImplForSmartAccountViaBoop() public {
        // Store the original implementation address
        bytes32 oldImpl = vm.load(smartAccount, ERC1967_IMPLEMENTATION_SLOT);

        // Create and submit upgrade transaction
        Boop memory upgradeBoop = _createSignedBoop(smartAccount, _getUpgradeCallData());
        entryPoint.submit(upgradeBoop.encode());

        // Verify implementation was updated
        bytes32 updatedImpl = vm.load(smartAccount, ERC1967_IMPLEMENTATION_SLOT);
        assertNotEq(oldImpl, updatedImpl, "Implementation not updated correctly");

        // Verify the implementation address points to the expected new implementation
        address implAddr = address(uint160(uint256(updatedImpl)));
        assertEq(implAddr, newImpl, "Implementation not updated correctly");

        // Create and submit mint transaction to verify new implementation works
        Boop memory mintBoop = _createSignedBoop(mockToken, _getMintCallData());
        entryPoint.submit(mintBoop.encode());

        // Verify mint was successful
        assertEq(MockERC20(mockToken).balanceOf(owner), MINT_AMOUNT, "Mint operation failed");
    }

    /// @dev Test upgradeability via a vanilla ethereum tx
    function testUpgradeImplForSmartAccountViaEthereumTx() public {
        // Store the original implementation address
        bytes32 oldImpl = vm.load(smartAccount, ERC1967_IMPLEMENTATION_SLOT);

        // Create and submit upgrade transaction
        vm.prank(owner);
        HappyAccount(payable(smartAccount)).upgradeToAndCall(newImpl, "");

        // Verify implementation was updated
        bytes32 updatedImpl = vm.load(smartAccount, ERC1967_IMPLEMENTATION_SLOT);
        assertNotEq(oldImpl, updatedImpl, "Implementation not updated correctly");

        // Verify the implementation address points to the expected new implementation
        address implAddr = address(uint160(uint256(updatedImpl)));
        assertEq(implAddr, newImpl, "Implementation not updated correctly");

        // Create and submit mint transaction to verify new implementation works
        Boop memory mintBoop = _createSignedBoop(mockToken, _getMintCallData());
        entryPoint.submit(mintBoop.encode());

        // Verify mint was successful
        assertEq(MockERC20(mockToken).balanceOf(owner), MINT_AMOUNT, "Mint operation failed");
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
        HappyAccount(payable(smartAccount)).upgradeToAndCall(newImpl, "");

        // Verify implementation was not updated
        bytes32 impl = vm.load(smartAccount, ERC1967_IMPLEMENTATION_SLOT);
        assertEq(impl, oldImpl, "Implementation should not have changed");
    }

    // ====================================================================================================
    // BOOP CREATION UTILS

    /// @dev Internal helper function to create a signed boop.
    function _createSignedBoop(address dest, bytes memory callData) internal view returns (Boop memory) {
        Boop memory boop = _getStubBoop();
        boop.dest = dest;
        boop.callData = callData;
        boop.validatorData = _signBoop(boop);
        return boop;
    }

    /// @dev Internal helper function to create a stub boop.
    function _getStubBoop() internal view returns (Boop memory) {
        return Boop({
            account: smartAccount,
            gasLimit: 4000000000,
            executeGasLimit: 4000000000,
            validateGasLimit: 4000000000,
            validatePaymentGasLimit: 4000000000,
            dest: 0x0000000000000000000000000000000000000000,
            paymaster: smartAccount,
            value: 0,
            nonceTrack: 0,
            nonceValue: _getNonce(),
            maxFeePerGas: 1200000000,
            submitterFee: 100,
            callData: "",
            paymasterData: "",
            validatorData: "",
            extraData: ""
        });
    }

    /// @dev Internal helper function to get the nonce of a smart account.
    function _getNonce() internal view returns (uint64) {
        return entryPoint.nonceValues(smartAccount, 0);
    }

    /// @dev Internal helper function to sign a boop.
    function _signBoop(Boop memory boop) internal view returns (bytes memory signature) {
        bytes32 hash = keccak256(boop.encode()).toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, hash);
        signature = abi.encodePacked(r, s, v);
    }

    /// @dev Internal helper function to create calldata for UUPSUpgradeable.upgradeToAndCall
    function _getUpgradeCallData() internal view returns (bytes memory) {
        return abi.encodeCall(UUPSUpgradeable.upgradeToAndCall, (newImpl, ""));
    }

    /// @dev Internal helper function to create calldata for IERC20.mint().
    function _getMintCallData() internal view returns (bytes memory) {
        return abi.encodeCall(MockERC20.mint, (owner, MINT_AMOUNT));
    }
}
