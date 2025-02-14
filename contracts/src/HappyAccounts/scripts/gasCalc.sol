// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {console, Test} from "forge-std/Test.sol";

import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {HappyTx} from "../core/HappyTx.sol";
import {HappyTxLib} from "../libs/HappyTxLib.sol";

import {MockERC20Token} from "../../mocks/MockERC20.sol";

import {HappyEntryPoint} from "../core/HappyEntryPoint.sol";
import {ScrappyAccount} from "../samples/ScrappyAccount.sol";
import {ScrappyPaymaster} from "../samples/ScrappyPaymaster.sol";
import {ScrappyAccountFactory} from "../factories/ScrappyAccountFactory.sol";

import {DeployHappyAAContracts} from "../../deploy/DeployHappyAA.s.sol";

contract HappyEntryPointGasEstimator is Test {
    using HappyTxLib for HappyTx;
    using MessageHashUtils for bytes32;

    // ====================================================================================================
    // CONSTANTS

    bytes32 private constant SALT = 0x0000000000000000000000000000000000000000000000000000000000000000;
    address private constant OWNER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address private constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;
    uint256 private constant DEPOSIT = 10 ether;

    // ====================================================================================================
    // STATE VARIABLES

    DeployHappyAAContracts private deployer;
    MockERC20Token private mockERC20;
    HappyEntryPoint private happyEntryPoint;
    ScrappyAccount private scrappyAccount;
    ScrappyPaymaster private scrappyPaymaster;
    ScrappyAccountFactory private scrappyAccountFactory;

    address private smartAccount;
    address private paymaster;
    address private target;

    // ====================================================================================================
    // COMMON TEST SETUP

    function setUp() public {
        // Set up the Deployment Script
        deployer = new DeployHappyAAContracts();

        // Deploy the happy-aa contracts as foundry-account-0
        vm.prank(OWNER);
        deployer.deployForTests();

        happyEntryPoint = deployer.happyEntryPoint();
        scrappyPaymaster = deployer.scrappyPaymaster();
        scrappyAccountFactory = deployer.scrappyAccountFactory();

        // Deploy and initialize the proxy for scrappy account
        smartAccount = scrappyAccountFactory.createAccount(SALT, OWNER);

        // Fund the smart account and paymaster
        vm.deal(smartAccount, DEPOSIT);
        vm.deal(address(scrappyPaymaster), DEPOSIT);

        // Deploy a mock ERC20 token
        mockERC20 = new MockERC20Token("MockTokenA", "MTA", uint8(18));
        target = address(mockERC20);

        paymaster = address(scrappyPaymaster);
    }

    // ====================================================================================================
    // SELF-PAYING HAPPY TX GAS ESTIMATION

    /**
     * @notice Measures gas usage for submitting transactions through the EntryPoint for
     * self-paying smart accounts, and analyzing different storage access patterns:
     * 1. Cold + uninitialized storage access (first ever transaction)
     * 2. Cold + initialized storage access (subsequent transactions in different blocks)
     * 3. Warm storage access (multiple transactions in same block)
     */
    function testEstimateEntryPointSubmitGasForSelfPayingTx() public {
        console.log("\nHappyEntryPoint Gas Report For Self-Paying Transactions");

        // Step 1. Submit the encoded happy tx (uninitialized and cold storage)
        console.log("\n1. First Transaction (Cold + Uninitialized Storage)");
        console.log(" ----------------------------------------------------");
        HappyTx memory happyTx1 = _createSignedHappyTx(smartAccount, smartAccount, 0);
        uint256 gasUninitialized = this._estimateSubmitGas(happyTx1.encode());
        console.log("   Tx Gas used: ", gasUninitialized);

        // Step 2. Submit the encoded happy tx (initialized and cold storage)
        console.log("\n2. Second Transaction (Cold + Initialized Storage)");
        console.log(" ----------------------------------------------------");
        HappyTx memory happyTx2 = _createSignedHappyTx(smartAccount, smartAccount, 1);
        uint256 gasCold = this._estimateSubmitGas(happyTx2.encode());
        console.log("   TxGas used: ", gasCold);
    }

    // ====================================================================================================
    // PAYMASTER-SPONSORED HAPPY TX GAS ESTIMATION

    /**
     * @notice Measures gas usage for submitting transactions through the EntryPoint for
     * self-paying smart accounts, and analyzing different storage access patterns:
     * 1. Cold + uninitialized storage access (first ever transaction)
     * 2. Cold + initialized storage access (subsequent transactions in different blocks)
     * 3. Warm storage access (multiple transactions in same block)
     */
    function testEstimateEntryPointSubmitGasForPaymasterSponsoredTx() public {
        console.log("\nHappyEntryPoint Gas Report For Paymaster-Sponsored Transactions");

        // Step 1. Submit the encoded happy tx (uninitialized and cold storage)
        console.log("\n1. First Transaction (Cold + Uninitialized Storage)");
        console.log(" ----------------------------------------------------");
        HappyTx memory happyTx1 = _createSignedHappyTx(smartAccount, paymaster, 0);
        uint256 gasUninitialized = this._estimateSubmitGas(happyTx1.encode());
        console.log("   Tx Gas used: ", gasUninitialized);

        // Step 2. Submit the encoded happy tx (initialized and cold storage)
        console.log("\n2. Second Transaction (Cold + Initialized Storage)");
        console.log(" ----------------------------------------------------");
        HappyTx memory happyTx2 = _createSignedHappyTx(smartAccount, paymaster, 1);
        uint256 gasCold = this._estimateSubmitGas(happyTx2.encode());
        console.log("   TxGas used: ", gasCold);
    }

    /// @dev Internal function to estimate gas used by `submit` for a single happy tx.
    /// This function is used when each call is executed as a separate transaction (due to `--isolate` flag).
    function _estimateSubmitGas(bytes memory encodedHappyTx) external returns (uint256) {
        uint256 gasBefore = gasleft();
        happyEntryPoint.submit(encodedHappyTx);
        uint256 gasAfter = gasleft();

        return gasBefore - gasAfter;
    }

    // ====================================================================================================
    // SCRAPPY ACCOUNT PAYOUT GAS ESTIMATION

    function testEstimateScrappyAccountPayoutGas() public {
        console.log("\nScrappyAccount payout gas usage");
        console.log(" ----------------------------------------------------");
        vm.prank(address(happyEntryPoint));
        HappyTx memory happyTx = _createSignedHappyTx(smartAccount, smartAccount, 0);
        ScrappyAccount(payable(smartAccount)).payout(happyTx, 0);
        // console.log("   payout internal gas used: ", gasUsed);
    }

    // ====================================================================================================
    // SCRAPPY PAYMASTER PAYOUT GAS ESTIMATION

    function testEstimateScrappyPaymasterPayoutGas() public {
        console.log("\nScrappyPaymaster payout gas usage");
        console.log(" ----------------------------------------------------");
        vm.prank(address(happyEntryPoint));
        HappyTx memory happyTx = _createSignedHappyTx(smartAccount, paymaster, 0);
        scrappyPaymaster.payout(happyTx, 0);
    }

    // ====================================================================================================
    // SCRAPPY ACCOUNT EXECUTE GAS ESTIMATION

    function testEstimateScrappyAccountExecuteGas() public {
        console.log("\nScrappyAccount execute gas usage");
        console.log(" ----------------------------------------------------");
        vm.prank(address(happyEntryPoint));
        HappyTx memory happyTx = _createSignedHappyTx(smartAccount, smartAccount, 0);
        ScrappyAccount(payable(smartAccount)).execute(happyTx);
    }

    // ====================================================================================================
    // HAPPY TX CREATION UTILS

    /// @dev Internal helper function to create a signed happy tx.
    function _createSignedHappyTx(address account, address _paymaster, uint256 nonce)
        internal
        view
        returns (HappyTx memory)
    {
        HappyTx memory happyTx = _getStubHappyTx();

        happyTx.account = account;
        happyTx.paymaster = _paymaster;
        happyTx.nonceTrack = 0;
        happyTx.nonceValue = uint64(nonce);

        happyTx.validatorData = signHappyTx(happyTx);
        return happyTx;
    }

    /// @dev Internal helper function to create a stub happy tx. The callData is `mint` call to a token at `dest`.
    function _getStubHappyTx() internal view returns (HappyTx memory) {
        return HappyTx({
            account: 0x0000000000000000000000000000000000000000, // Stub value
            gasLimit: 4000000000, // 0xEE6B2800
            executeGasLimit: 4000000000, // 0xEE6B2800
            dest: target,
            paymaster: 0x0000000000000000000000000000000000000000, // Stub value
            value: 0,
            nonceTrack: 0,
            nonceValue: 0,
            maxFeePerGas: 1200000000, // 0x47868C00
            submitterFee: 100, // 0x64
            callData: _getMintCallData(),
            paymasterData: hex"",
            validatorData: hex"",
            extraData: hex""
        });
    }

    /// @dev Internal helper function to sign a happy tx.
    function signHappyTx(HappyTx memory happyTx) internal pure returns (bytes memory signature) {
        bytes32 hash = keccak256(happyTx.encode()).toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) =
            vm.sign(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80, hash);
        signature = abi.encodePacked(r, s, v);
    }

    /// @dev Internal helper function to create calldata for IERC20.mint().
    function _getMintCallData() internal view returns (bytes memory) {
        return abi.encodeCall(MockERC20Token.mint, (target, DEPOSIT));
    }
}
