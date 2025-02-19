// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {HappyTx} from "../core/HappyTx.sol";
import {HappyTxLib} from "../libs/HappyTxLib.sol";

import {MockERC20Token} from "../../mocks/MockERC20.sol";

import {HappyEntryPoint} from "../core/HappyEntryPoint.sol";
import {ScrappyAccount} from "../samples/ScrappyAccount.sol";
import {ScrappyAccountFactory} from "../factories/ScrappyAccountFactory.sol";

import {DeployHappyAAContracts} from "../../deploy/DeployHappyAA.s.sol";

contract UpgradeSCATest is Test {
    using HappyTxLib for HappyTx;
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

    ScrappyAccountFactory private scrappyAccountFactory;
    HappyEntryPoint private happyEntryPoint;

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
        DeployHappyAAContracts deployer = new DeployHappyAAContracts();

        // Deploy the happy-aa contracts as foundry-account-0
        vm.prank(owner);
        deployer.deployForTests();

        scrappyAccountFactory = deployer.scrappyAccountFactory();
        happyEntryPoint = deployer.happyEntryPoint();

        // Deploy and initialize the proxy for scrappy account
        smartAccount = scrappyAccountFactory.createAccount(SALT, owner);

        // Deploy the new implementation
        newImpl = address(new ScrappyAccount(address(happyEntryPoint)));

        // Deploy a mock ERC20 token
        mockToken = address(new MockERC20Token("MockTokenA", "MTA", uint8(18)));

        // Fund the smart account
        vm.deal(smartAccount, DEPOSIT);
    }

    // ====================================================================================================
    // TEST TO UPGRADE IMPL OF HAPPY ACCOUNT

    function testUpgradeImplForSmartAccount() public {
        // Store the original implementation address
        bytes32 oldImpl = vm.load(smartAccount, ERC1967_IMPLEMENTATION_SLOT);

        // Create and submit upgrade transaction
        HappyTx memory upgradeTx = _createSignedHappyTx(smartAccount, _getUpgradeCallData());
        happyEntryPoint.submit(upgradeTx.encode());

        // Verify implementation was updated
        bytes32 updatedImpl = vm.load(smartAccount, ERC1967_IMPLEMENTATION_SLOT);
        assertNotEq(oldImpl, updatedImpl, "Implementation not updated correctly");

        // Verify the implementation address points to the expected new implementation
        address implAddr = address(uint160(uint256(updatedImpl)));
        assertEq(implAddr, newImpl, "Implementation not updated correctly");

        // Create and submit mint transaction to verify new implementation works
        HappyTx memory mintTx = _createSignedHappyTx(mockToken, _getMintCallData());
        happyEntryPoint.submit(mintTx.encode());

        // Verify mint was successful
        assertEq(MockERC20Token(mockToken).balanceOf(owner), MINT_AMOUNT, "Mint operation failed");
    }

    // ====================================================================================================
    // HAPPY TX CREATION UTILS

    /// @dev Internal helper function to create a signed happy tx.
    function _createSignedHappyTx(address dest, bytes memory callData) internal view returns (HappyTx memory) {
        HappyTx memory happyTx = _getStubHappyTx();
        happyTx.dest = dest;
        happyTx.callData = callData;
        happyTx.validatorData = _signHappyTx(happyTx);
        return happyTx;
    }

    /// @dev Internal helper function to create a stub happy tx.
    function _getStubHappyTx() internal view returns (HappyTx memory) {
        return HappyTx({
            account: smartAccount,
            gasLimit: 4000000000,
            executeGasLimit: 4000000000,
            dest: 0x0000000000000000000000000000000000000000,
            paymaster: smartAccount,
            value: 0,
            nonceTrack: 0,
            nonceValue: _getNonce(),
            maxFeePerGas: 1200000000,
            submitterFee: 100,
            callData: hex"",
            paymasterData: hex"",
            validatorData: hex"",
            extraData: hex""
        });
    }

    /// @dev Internal helper function to get the nonce of a smart account.
    function _getNonce() internal view returns (uint64) {
        return uint64(ScrappyAccount(payable(smartAccount)).getNonce(0));
    }

    /// @dev Internal helper function to sign a happy tx.
    function _signHappyTx(HappyTx memory happyTx) internal view returns (bytes memory signature) {
        bytes32 hash = keccak256(happyTx.encode()).toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, hash);
        signature = abi.encodePacked(r, s, v);
    }

    /// @dev Internal helper function to create calldata for UUPSUpgradeable.upgradeToAndCall
    function _getUpgradeCallData() internal view returns (bytes memory) {
        return abi.encodeCall(UUPSUpgradeable.upgradeToAndCall, (newImpl, hex""));
    }

    /// @dev Internal helper function to create calldata for IERC20.mint().
    function _getMintCallData() internal view returns (bytes memory) {
        return abi.encodeCall(MockERC20Token.mint, (owner, MINT_AMOUNT));
    }
}
