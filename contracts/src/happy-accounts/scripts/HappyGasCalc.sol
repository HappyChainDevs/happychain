// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {console, Test} from "forge-std/Test.sol";

import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {DeployHappyAAContracts} from "../../deploy/DeployHappyAA.s.sol";
import {MockERC20} from "../../mocks/MockERC20.sol";

import {HappyEntryPoint} from "boop/core/HappyEntryPoint.sol";
import {HappyTx} from "boop/core/HappyTx.sol";
import {ScrappyAccountFactory} from "boop/factories/ScrappyAccountFactory.sol";
import {HappyTxLib} from "boop/libs/HappyTxLib.sol";
import {ScrappyAccount} from "boop/samples/ScrappyAccount.sol";
import {ScrappyPaymaster} from "boop/samples/ScrappyPaymaster.sol";

contract HappyEntryPointGasEstimator is Test {
    using HappyTxLib for HappyTx;
    using MessageHashUtils for bytes32;

    // ====================================================================================================
    // CONSTANTS

    bytes32 private constant SALT = 0x0000000000000000000000000000000000000000000000000000000000000000;
    address private constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;
    uint256 private constant DEPOSIT = 10 ether;

    // ====================================================================================================
    // STATE VARIABLES

    DeployHappyAAContracts private deployer;
    MockERC20 private mockERC20;
    HappyEntryPoint private happyEntryPoint;
    ScrappyAccount private scrappyAccount;
    ScrappyPaymaster private scrappyPaymaster;
    ScrappyAccountFactory private scrappyAccountFactory;

    address private smartAccount;
    address private paymaster;
    address private target;
    uint256 private privKey;
    address private owner;

    // ====================================================================================================
    // COMMON TEST SETUP

    function setUp() public {
        privKey = uint256(vm.envBytes32("PRIVATE_KEY_LOCAL"));
        owner = vm.addr(privKey);

        // Set up the Deployment Script
        deployer = new DeployHappyAAContracts();

        // Deploy the happy-aa contracts as foundry-account-0
        vm.prank(owner);
        deployer.deployForTests();

        happyEntryPoint = deployer.happyEntryPoint();
        scrappyPaymaster = deployer.scrappyPaymaster();
        scrappyAccountFactory = deployer.scrappyAccountFactory();

        // Deploy and initialize the proxy for scrappy account
        smartAccount = scrappyAccountFactory.createAccount(SALT, owner);

        // Fund the smart account and paymaster
        vm.deal(smartAccount, DEPOSIT);
        vm.deal(address(scrappyPaymaster), DEPOSIT);

        // Deploy a mock ERC20 token
        mockERC20 = new MockERC20("MockTokenA", "MTA", uint8(18));
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
        HappyTx memory happyTx1 = _createSignedHappyTx(smartAccount, smartAccount);
        uint256 gasUninitialized = this._estimateSubmitGas(happyTx1.encode());
        console.log("   Tx Gas used: ", gasUninitialized);

        // Step 2. Submit the encoded happy tx (initialized and cold storage)
        console.log("\n2. Second Transaction (Cold + Initialized Storage)");
        console.log(" ----------------------------------------------------");
        HappyTx memory happyTx2 = _createSignedHappyTx(smartAccount, smartAccount);
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
        HappyTx memory happyTx1 = _createSignedHappyTx(smartAccount, paymaster);
        uint256 gasUninitialized = this._estimateSubmitGas(happyTx1.encode());
        console.log("   Tx Gas used: ", gasUninitialized);

        // Step 2. Submit the encoded happy tx (initialized and cold storage)
        console.log("\n2. Second Transaction (Cold + Initialized Storage)");
        console.log(" ----------------------------------------------------");
        HappyTx memory happyTx2 = _createSignedHappyTx(smartAccount, paymaster);
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
        HappyTx memory happyTx = _createSignedHappyTx(smartAccount, smartAccount);
        vm.prank(address(happyEntryPoint));
        ScrappyAccount(payable(smartAccount)).validatePayment(happyTx, 0);
    }

    // ====================================================================================================
    // SCRAPPY PAYMASTER PAYOUT GAS ESTIMATION

    function testEstimateScrappyPaymasterPayoutGas() public {
        console.log("\nScrappyPaymaster payout gas usage");
        console.log(" ----------------------------------------------------");
        HappyTx memory happyTx = _createSignedHappyTx(smartAccount, paymaster);
        vm.prank(address(happyEntryPoint));
        scrappyPaymaster.validatePayment(happyTx, 0);
    }

    // ====================================================================================================
    // SCRAPPY ACCOUNT EXECUTE GAS ESTIMATION

    function testEstimateScrappyAccountExecuteGas() public {
        console.log("\nScrappyAccount execute gas usage");
        console.log(" ----------------------------------------------------");
        HappyTx memory happyTx = _createSignedHappyTx(smartAccount, smartAccount);
        vm.prank(address(happyEntryPoint));
        ScrappyAccount(payable(smartAccount)).execute(happyTx);
    }

    // ====================================================================================================
    // FUNCTION DISPATCH OVERHEAD ESTIMATION

    function testEstimateFunctionDispatchOverhead() public pure {
        console.log("\nHappyTxLib txGasFromCallGas payout gas usage");
        console.log(" ----------------------------------------------------");
        console.log("  txGasFromCallGas function gas usage: 3"); // Hardcoded for sake of gas report generation
    }

    // ====================================================================================================
    // HAPPY TX CREATION UTILS

    /// @dev Internal helper function to create a signed happy tx.
    function _createSignedHappyTx(address _account, address _paymaster) internal view returns (HappyTx memory) {
        HappyTx memory happyTx = _getStubHappyTx();

        happyTx.account = _account;
        happyTx.paymaster = _paymaster;
        happyTx.nonceTrack = 0;
        happyTx.nonceValue = _getNonce();

        // Store original values
        uint32 origGasLimit;
        uint32 origExecuteGasLimit;
        uint256 origMaxFeePerGas;
        int256 origSubmitterFee;

        if (_paymaster != _account) {
            // Store original values
            origGasLimit = happyTx.gasLimit;
            origExecuteGasLimit = happyTx.executeGasLimit;
            origMaxFeePerGas = happyTx.maxFeePerGas;
            origSubmitterFee = happyTx.submitterFee;

            // Temporarily zero them for signing
            happyTx.gasLimit = 0;
            happyTx.executeGasLimit = 0;
            happyTx.maxFeePerGas = 0;
            happyTx.submitterFee = 0;
        }

        // Sign the transaction with zeroed values
        happyTx.validatorData = _signHappyTx(happyTx);

        if (_paymaster != _account) {
            // Restore original values after signing
            happyTx.gasLimit = origGasLimit;
            happyTx.executeGasLimit = origExecuteGasLimit;
            happyTx.maxFeePerGas = origMaxFeePerGas;
            happyTx.submitterFee = origSubmitterFee;
        }

        return happyTx;
    }

    /// @dev Internal helper function to create a stub happy tx. The callData is `mint` call to a token at `dest`.
    function _getStubHappyTx() internal view returns (HappyTx memory) {
        return HappyTx({
            account: 0x0000000000000000000000000000000000000000, // Stub value
            gasLimit: 4000000000, // 0xEE6B2800
            executeGasLimit: 4000000000, // 0xEE6B2800
            validateGasLimit: 4000000000, // 0xEE6B2800
            payoutGasLimit: 4000000000, // 0xEE6B2800
            dest: target,
            paymaster: 0x0000000000000000000000000000000000000000, // Stub value
            value: 0,
            nonceTrack: 0,
            nonceValue: 0,
            maxFeePerGas: 1200000000, // 0x47868C00
            submitterFee: 100, // 0x64
            callData: _getMintCallData(),
            paymasterData: "",
            validatorData: "",
            extraData: ""
        });
    }

    /// @dev Internal helper function to sign a happy tx.
    function _signHappyTx(HappyTx memory happyTx) internal view returns (bytes memory signature) {
        bytes32 hash = keccak256(happyTx.encode()).toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, hash);
        signature = abi.encodePacked(r, s, v);
    }

    /// @dev Internal helper function to create calldata for IERC20.mint().
    function _getMintCallData() internal pure returns (bytes memory) {
        return abi.encodeCall(MockERC20.mint, (ZERO_ADDRESS, DEPOSIT));
    }

    /// @dev Internal helper function to get the nonce of a smart account.
    function _getNonce() internal view returns (uint64) {
        return happyEntryPoint.nonceValues(smartAccount, 0);
    }
}
