// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {MockERC20} from "../../mocks/MockERC20.sol";
import {DeployHappyAAContracts} from "../../deploy/DeployHappyAA.s.sol";

import {HappyEntryPoint} from "boop/core/HappyEntryPoint.sol";
import {HappyTx} from "boop/core/HappyTx.sol";
import {ScrappyAccountFactory} from "boop/factories/ScrappyAccountFactory.sol";
import {HappyTxLib} from "boop/libs/HappyTxLib.sol";
import {ScrappyAccount} from "boop/samples/ScrappyAccount.sol";
import {ScrappyAccountBeacon} from "boop/samples/ScrappyAccountBeacon.sol";

contract UpgradeSCATest is Test {
    using HappyTxLib for HappyTx;
    using MessageHashUtils for bytes32;

    // ====================================================================================================
    // CONSTANTS
    bytes32 private constant ERC1967_BEACON_SLOT = 0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50;
    bytes32 private constant SALT = 0;
    uint256 private constant DEPOSIT = 10 ether;
    uint256 private constant MINT_AMOUNT = 5 ether;

    // ====================================================================================================
    // STATE VARIABLES

    ScrappyAccountFactory private scrappyAccountFactory;
    HappyEntryPoint private happyEntryPoint;
    ScrappyAccountBeacon private accountBeacon;
    ScrappyAccount private scrappyAccountImpl;

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
        accountBeacon = deployer.scrappyAccountBeacon();
        scrappyAccountImpl = deployer.scrappyAccountImpl();

        // Deploy and initialize the proxy for scrappy account
        smartAccount = scrappyAccountFactory.createAccount(SALT, owner);

        // Deploy the new implementation
        newImpl = address(new ScrappyAccount(address(happyEntryPoint)));

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
        assertEq(accountBeacon.implementation(), address(scrappyAccountImpl));

        // Account should be able to mint tokens
        HappyTx memory mintTx = _createSignedHappyTx(mockToken, _getMintCallData());
        happyEntryPoint.submit(mintTx.encode());
        assertEq(MockERC20(mockToken).balanceOf(owner), MINT_AMOUNT, "Mint operation failed");   

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
        HappyTx memory mintTx2 = _createSignedHappyTx(mockToken, _getMintCallData());
        happyEntryPoint.submit(mintTx2.encode());

        // Verify mint was successful
        assertEq(MockERC20(mockToken).balanceOf(owner), (oldBalance + MINT_AMOUNT), "Mint operation failed");
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
        return happyEntryPoint.nonceValues(smartAccount, 0);
    }

    /// @dev Internal helper function to sign a happy tx.
    function _signHappyTx(HappyTx memory happyTx) internal view returns (bytes memory signature) {
        bytes32 hash = keccak256(happyTx.encode()).toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, hash);
        signature = abi.encodePacked(r, s, v);
    }

    /// @dev Internal helper function to create calldata for IERC20.mint().
    function _getMintCallData() internal view returns (bytes memory) {
        return abi.encodeCall(MockERC20.mint, (owner, MINT_AMOUNT));
    }
}
