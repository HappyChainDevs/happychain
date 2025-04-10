// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {HappyAccountBeacon} from "boop/happychain/HappyAccountBeacon.sol";
import {MockERC20} from "../../../mocks/MockERC20.sol";
import {DeployBoopContracts} from "../../../deploy/DeployBoop.s.sol";
import {Boop} from "boop/interfaces/Types.sol";
import {Encoding} from "../../../boop/core/Encoding.sol";
import {EntryPoint} from "boop/core/EntryPoint.sol";
import {HappyAccount} from "boop/happychain/HappyAccount.sol";
import {HappyAccountFactory} from "boop/happychain/HappyAccountFactory.sol";
import {Boop} from "boop/interfaces/Types.sol";
import {Test} from "forge-std/Test.sol";
import {MessageHashUtils} from "openzeppelin/utils/cryptography/MessageHashUtils.sol";
import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {DeployBoopContracts} from "src/deploy/DeployBoop.s.sol";
import {MockERC20} from "src/mocks/MockERC20.sol";

contract UpgradeSCATest is Test {
    using Encoding for Boop;
    using MessageHashUtils for bytes32;

    // ====================================================================================================
    // CONSTANTS
    bytes32 private constant ERC1967_BEACON_SLOT = 0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50;
    bytes32 private constant SALT = 0;
    uint256 private constant DEPOSIT = 10 ether;
    uint256 private constant MINT_AMOUNT = 5 ether;

    // ====================================================================================================
    // STATE VARIABLES

    HappyAccountFactory private happyAccountFactory;
    EntryPoint private entrypoint;
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

        happyAccountFactory = deployer.happyAccountFactory();
        entrypoint = deployer.entryPoint();
        accountBeacon = deployer.happyAccountBeacon();
        happyAccountImpl = deployer.happyAccountImpl();

        // Deploy and initialize the proxy for scrappy account
        smartAccount = happyAccountFactory.createAccount(SALT, owner);

        // Deploy the new implementation
        newImpl = address(new HappyAccount(address(entrypoint)));

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
        Boop memory mintTx = _createSignedBoop(mockToken, _getMintCallData());
        entrypoint.submit(mintTx.encode());
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
        Boop memory mintTx2 = _createSignedBoop(mockToken, _getMintCallData());
        entrypoint.submit(mintTx2.encode());

        // Verify mint was successful
        assertEq(MockERC20(mockToken).balanceOf(owner), (oldBalance + MINT_AMOUNT), "Mint operation failed");
    }

    // ====================================================================================================
    // BOOP TX CREATION UTILS

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
            payer: smartAccount,
            value: 0,
            nonceTrack: 0,
            nonceValue: _getNonce(),
            maxFeePerGas: 1200000000,
            submitterFee: 100,
            callData: "",
            validatorData: "",
            extraData: ""
        });
    }

    /// @dev Internal helper function to get the nonce of a smart account.
    function _getNonce() internal view returns (uint64) {
        return entrypoint.nonceValues(smartAccount, 0);
    }

    /// @dev Internal helper function to sign a boop.
    function _signBoop(Boop memory boop) internal view returns (bytes memory signature) {
        bytes32 hash = keccak256(abi.encodePacked(boop.encode(), block.chainid)).toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, hash);
        signature = abi.encodePacked(r, s, v);
    }

    /// @dev Internal helper function to create calldata for IERC20.mint().
    function _getMintCallData() internal view returns (bytes memory) {
        return abi.encodeCall(MockERC20.mint, (owner, MINT_AMOUNT));
    }
}
