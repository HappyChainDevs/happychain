// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/Script.sol";

import {HappyTx} from "../core/HappyTx.sol";
import {HappyTxLib} from "../libs/HappyTxLib.sol";

import {HappyEntryPoint} from "../core/HappyEntryPoint.sol";
import {ScrappyAccount} from "../samples/ScrappyAccount.sol";
import {ScrappyPaymaster} from "../samples/ScrappyPaymaster.sol";
import {ScrappyAccountFactory} from "../factories/ScrappyAccountFactory.sol";

import {DeployHappyAAContracts} from "../../deploy/DeployHappyAA.s.sol";

contract HappyEntryPointGasEstimator is Test {
    using HappyTxLib for HappyTx;

    bytes32 private constant DEPLOYMENT_SALT = 0;
    address private constant DEPLOYER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address private constant OWNER = 0x4BC8e81Ad3BE83276837f184138FC96770C14297;

    DeployHappyAAContracts private deployer;
    ScrappyPaymaster private scrappyPaymaster;
    HappyEntryPoint private happyEntryPoint;
    ScrappyAccount private scrappyAccountImpl;
    ScrappyAccount private scrappyAccount;
    ScrappyAccountFactory private scrappyAccountFactory;

    function setUp() public {
        // Set up the Deployment Script
        deployer = new DeployHappyAAContracts();

        // Deploy the happy-aa contracts
        vm.prank(DEPLOYER);
        deployer.deployForTests();

        happyEntryPoint = deployer.happyEntryPoint();
        scrappyPaymaster = deployer.scrappyPaymaster();
        scrappyAccountFactory = deployer.scrappyAccountFactory();
        scrappyAccountImpl = deployer.scrappyAccount();
        
        // Deploy a Smart Account using the factory
        address _scrappyAccount = scrappyAccountFactory.createAccount(DEPLOYMENT_SALT, OWNER);
        scrappyAccount = ScrappyAccount(payable(_scrappyAccount));

        // TODO: transfer call AFTER state change ^^, else, linter gives reentrancy attack warning :p
        // Fund the paymaster with some gas tokens
        payable(address(scrappyPaymaster)).transfer(10 ether);
    }

    // ====================================================================================================
    // SELF-PAYING HAPPY TXs

    function testEstimateEntryPointSubmitGas() public {
        // Step 1. Submit the encoded happy tx (uninitialized and cold storage)
        bytes memory encodedHappyTx = _getSelfPayingEncodedHappyTx();
        uint256 gasUninitialized = estimateHappyEPSubmitGasForSingleTx(encodedHappyTx);
        console.log("Gas used in submit (uninitialized and cold storage):", gasUninitialized);

        // Step 2. Submit the encoded happy tx (initialized, but cold storage)
        uint256 gasCold = estimateHappyEPSubmitGasForSingleTx(encodedHappyTx);
        console.log("Gas used in submit (initialized, but cold storage):", gasCold);
    }

    // ====================================================================================================
    // SUBMITTER-SPONSORED HAPPY TXs

    // ====================================================================================================
    // GAS ESTIMATION UTILS

    /// @dev Internal function to estimate gas used by `submit` for a single happy tx.
    function estimateHappyEPSubmitGasForSingleTx(bytes memory encodedHappyTx) public returns (uint256) {
        uint256 gasBefore = gasleft();
        happyEntryPoint.submit(encodedHappyTx);
        uint256 gasAfter = gasleft();
        return gasBefore - gasAfter;
    }

    // ====================================================================================================
    // HAPPY TX CREATION UTILS

    /**
     * @dev Internal helper function to create a simple `HappyTx`. The values are hardcoded for
     *      testing purposes, and were obtained from a real happy-aa transaction submitted on-chain.
     *      The account itself pays for the gas and the submitter fee.
     */
    function _createSelfPayingHappyTx() internal pure returns (HappyTx memory) {
        return HappyTx({
            account: 0x9B1939cf7db082897e270B621591C7A90dBD6f92,
            gasLimit: 4000000000, // 0xEE6B2800
            executeGasLimit: 4000000000, // 0xEE6B2800
            dest: 0x07b354EFA748883a342a9ba4780Cc9728f51e3D5,
            paymaster: 0x9B1939cf7db082897e270B621591C7A90dBD6f92,
            value: 0,
            nonceTrack: 0,
            nonceValue: 0,
            maxFeePerGas: 1200000, // 0x124F80
            submitterFee: 100, // 0x64
            callData: hex"40c10f190000000000000000000000009b1939cf7db082897e270b621591c7a90dbd6f9200000000000000000000000000000000000000000000000000038d7ea4c68000",
            paymasterData: hex"",
            validatorData: hex"89fefe1dd04429773236e00b8058c461a596413f2e6abac71ffcfbbdb961669654de7ff6bd202d4e300f8bc491a7be2b329490069b4c5db8d189da206f910c781c",
            extraData: hex""
        });
    }

    /**
     * @dev Internal helper function to create a simple `HappyTx`. The values are hardcoded for
     *      testing purposes, and were obtained from a real happy-aa transaction submitted on-chain.
     *      Submitter (0x0000000000000000000000000000000000000000) acts as the paymaster.
     */
    function _createSubmitterSponsoredHappyTx() internal pure returns (HappyTx memory) {
        return HappyTx({
            account: 0x9B1939cf7db082897e270B621591C7A90dBD6f92,
            gasLimit: 4000000000, // 0xEE6B2800
            executeGasLimit: 4000000000, // 0xEE6B2800
            dest: 0x07b354EFA748883a342a9ba4780Cc9728f51e3D5,
            paymaster: 0x0000000000000000000000000000000000000000,
            value: 0,
            nonceTrack: 0,
            nonceValue: 1,
            maxFeePerGas: 1200000, // 0x124F80
            submitterFee: 100, // 0x64
            callData: hex"40c10f190000000000000000000000009b1939cf7db082897e270b621591c7a90dbd6f9200000000000000000000000000000000000000000000000000038d7ea4c68000",
            paymasterData: hex"",
            validatorData: hex"2edfb8f8ab47aec96ec5fe25d5c6072d160bfdef88eca6b07e2e809ff18401271212a089746c2fd93cd09e8f76a4cbda2878738a6b64802fc5c2092d02a69b571b",
            extraData: hex""
        });
    }

    /**
     * @dev Internal helper function to get the encoded happyTx.
     * With account as the paymaster.
     */
    function _getSelfPayingEncodedHappyTx() internal pure returns (bytes memory) {
        return
        hex"9b1939cf7db082897e270b621591c7a90dbd6f92ee6b2800ee6b280007b354efa748883a342a9ba4780cc9728f51e3d59b1939cf7db082897e270b621591c7a90dbd6f92000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000124f8000000000000000000000000000000000000000000000000000000000000000640000004440c10f190000000000000000000000009b1939cf7db082897e270b621591c7a90dbd6f9200000000000000000000000000000000000000000000000000038d7ea4c68000000000000000004189fefe1dd04429773236e00b8058c461a596413f2e6abac71ffcfbbdb961669654de7ff6bd202d4e300f8bc491a7be2b329490069b4c5db8d189da206f910c781c00000000";
    }

    /**
     * @dev Internal helper function to get the encoded happyTx.
     * With the submitter (0x0000000000000000000000000000000000000000) as the paymaster.
     */
    function _getSubmitterSponsoredEncodedHappyTx() internal pure returns (bytes memory) {
        return
        hex"9b1939cf7db082897e270b621591c7a90dbd6f92ee6b2800ee6b280007b354efa748883a342a9ba4780cc9728f51e3d50000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000124f8000000000000000000000000000000000000000000000000000000000000000640000004440c10f190000000000000000000000009b1939cf7db082897e270b621591c7a90dbd6f9200000000000000000000000000000000000000000000000000038d7ea4c6800000000000000000412edfb8f8ab47aec96ec5fe25d5c6072d160bfdef88eca6b07e2e809ff18401271212a089746c2fd93cd09e8f76a4cbda2878738a6b64802fc5c2092d02a69b571b00000000";
    }
}
