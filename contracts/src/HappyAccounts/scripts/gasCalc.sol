// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/Script.sol";

import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {HappyTx} from "../core/HappyTx.sol";
import {HappyTxLib} from "../libs/HappyTxLib.sol";

import {MockERC20Token} from "../../mocks/MockERC20.sol";

import {HappyEntryPoint} from "../core/HappyEntryPoint.sol";
import {ScrappyAccount} from "../samples/ScrappyAccount.sol";
import {ScrappyPaymaster} from "../samples/ScrappyPaymaster.sol";
import {ScrappyAccountFactory} from "../factories/ScrappyAccountFactory.sol";

import {DeployHappyAAContracts} from "../../deploy/DeployHappyAA.s.sol";

// TODO: If we don't want to hardcode the calldata and the `dest` field, then we can properly deploy the MockToken, and store its address in a state variable.
bytes constant MOCK_TOKEN_BYTECODE =
    hex"6080806040526004361015610012575f80fd5b5f3560e01c90816306fdde0314610e5e57508063095ea7b314610dd95780631624f6c6146108d057806318160ddd146108b357806323b872dd14610794578063313ce567146107745780633644e5151461075257806340c10f19146106c157806342966c681461064c57806370a08231146106075780637ecebe00146105c257806395d89b41146104ca578063a9059cbb14610419578063d505accf146101335763dd62ed3e146100c1575f80fd5b3461012f57604060031936011261012f576100da610f45565b73ffffffffffffffffffffffffffffffffffffffff6100f7610f68565b91165f52600560205273ffffffffffffffffffffffffffffffffffffffff60405f2091165f52602052602060405f2054604051908152f35b5f80fd5b3461012f5760e060031936011261012f5761014c610f45565b610154610f68565b604435606435916084359260ff841680940361012f574281106103bb5773ffffffffffffffffffffffffffffffffffffffff61018e611091565b951693845f52600860205260405f20908154967fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff881461038e576020945f9460809460018b0190556040519073ffffffffffffffffffffffffffffffffffffffff888301937f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c985528b6040850152169a8b6060840152898784015260a083015260c082015260c0815261024260e082610f8b565b51902060405190868201927f190100000000000000000000000000000000000000000000000000000000000084526022830152604282015260428152610289606282610f8b565b519020906040519182528482015260a435604082015260c435606082015282805260015afa156103835773ffffffffffffffffffffffffffffffffffffffff5f51168015158061037a575b1561031c577f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925916020915f526005825260405f20855f5282528060405f2055604051908152a3005b60646040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600e60248201527f494e56414c49445f5349474e45520000000000000000000000000000000000006044820152fd5b508281146102d4565b6040513d5f823e3d90fd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b60646040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601760248201527f5045524d49545f444541444c494e455f455850495245440000000000000000006044820152fd5b3461012f57604060031936011261012f57610432610f45565b73ffffffffffffffffffffffffffffffffffffffff60243591335f5260046020526104618360405f20546111f8565b335f52600460205260405f20551690815f5260046020526104868160405f205461126a565b825f52600460205260405f20556040519081527fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef60203392a3602060405160018152f35b3461012f575f60031936011261012f576040515f6001546104ea81611040565b80845290600181169081156105805750600114610522575b61051e8361051281850382610f8b565b60405191829182610efd565b0390f35b91905060015f527fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6915f905b80821061056657509091508101602001610512610502565b91926001816020925483858801015201910190929161054e565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001660208086019190915291151560051b840190910191506105129050610502565b3461012f57602060031936011261012f5773ffffffffffffffffffffffffffffffffffffffff6105f0610f45565b165f526008602052602060405f2054604051908152f35b3461012f57602060031936011261012f5773ffffffffffffffffffffffffffffffffffffffff610635610f45565b165f526004602052602060405f2054604051908152f35b3461012f57602060031936011261012f575f60043533825260046020526106778160408420546111f8565b33835260046020526040832055610690816003546111f8565b6003556040519081527fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef60203392a3005b3461012f57604060031936011261012f576106da610f45565b5f7fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef602073ffffffffffffffffffffffffffffffffffffffff602435946107238660035461126a565b60035516938484526004825261073d81604086205461126a565b858552600483526040852055604051908152a3005b3461012f575f60031936011261012f57602061076c611091565b604051908152f35b3461012f575f60031936011261012f57602060ff60025416604051908152f35b3461012f57606060031936011261012f576107ad610f45565b6107b5610f68565b7fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef602073ffffffffffffffffffffffffffffffffffffffff80604435951693845f526005835260405f208233165f52835260405f2054867fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff820361088c575b5050845f526004835261084b8660405f20546111f8565b855f526004845260405f20551693845f526004825261086e8160405f205461126a565b855f526004835260405f2055604051908152a3602060405160018152f35b610895916111f8565b855f526005845260405f208333165f52845260405f20558686610834565b3461012f575f60031936011261012f576020600354604051908152f35b3461012f57606060031936011261012f5760043567ffffffffffffffff811161012f57610901903690600401610fcc565b60243567ffffffffffffffff811161012f57610921903690600401610fcc565b60443560ff811680910361012f5760ff60095416610d7b57825167ffffffffffffffff8111610be7576109545f54611040565b601f8111610cdb575b506020601f8211600114610c1f57819293945f92610c14575b50507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8260011b9260031b1c1916175f555b815167ffffffffffffffff8111610be7576109c4600154611040565b601f8111610b46575b50602092601f8211600114610a8a57928192935f92610a7f575b50507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8260011b9260031b1c1916176001555b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00600254161760025546600655610a4f6110ab565b600755600980547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001179055005b0151905083806109e7565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe082169360015f527fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6915f5b868110610b2e5750836001959610610af7575b505050811b01600155610a1a565b01517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff60f88460031b161c19169055838080610ae9565b91926020600181928685015181550194019201610ad6565b60015f52601f820160051c7fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6019060208310610bbf575b601f0160051c7fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf601905b818110610bb457506109cd565b5f8155600101610ba7565b7fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf69150610b7d565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b015190508480610976565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08216905f80527f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563915f5b818110610cc357509583600195969710610c8c575b505050811b015f556109a8565b01517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff60f88460031b161c19169055848080610c7f565b9192602060018192868b015181550194019201610c6a565b5f8052601f820160051c7f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563019060208310610d53575b601f0160051c7f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e56301905b818110610d48575061095d565b5f8155600101610d3b565b7f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e5639150610d11565b60646040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601360248201527f414c52454144595f494e495449414c495a4544000000000000000000000000006044820152fd5b3461012f57604060031936011261012f57610df2610f45565b73ffffffffffffffffffffffffffffffffffffffff60243591335f52600560205260405f208282165f526020528260405f205560405192835216907f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92560203392a3602060405160018152f35b3461012f575f60031936011261012f575f8054610e7a81611040565b80845290600181169081156105805750600114610ea15761051e8361051281850382610f8b565b5f8080527f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563939250905b808210610ee357509091508101602001610512610502565b919260018160209254838588010152019101909291610ecb565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f602060409481855280519182918282880152018686015e5f8582860101520116010190565b6004359073ffffffffffffffffffffffffffffffffffffffff8216820361012f57565b6024359073ffffffffffffffffffffffffffffffffffffffff8216820361012f57565b90601f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0910116810190811067ffffffffffffffff821117610be757604052565b81601f8201121561012f5780359067ffffffffffffffff8211610be7576040519261101f60207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f8601160185610f8b565b8284526020838301011161012f57815f926020809301838601378301015290565b90600182811c92168015611087575b602083101461105a57565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b91607f169161104f565b60065446036110a05760075490565b6110a86110ab565b90565b6040515f905f5491816110bd84611040565b9182825260208201946001811690815f146111be5750600114611161575b6110e792500382610f8b565b51902060405160208101917f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f835260408201527fc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc660608201524660808201523060a082015260a0815261115b60c082610f8b565b51902090565b505f80805290917f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e5635b8183106111a25750509060206110e7928201016110db565b602091935080600191548385880101520191019091839261118a565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00168652506110e792151560051b820160200190506110db565b9080821061120c57810390811161038e5790565b60646040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601c60248201527f45524332303a207375627472616374696f6e20756e646572666c6f77000000006044820152fd5b9081019081811161038e57811061127e5790565b60646040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601860248201527f45524332303a206164646974696f6e206f766572666c6f7700000000000000006044820152fdfea2646970667358221220e589faad19c74033b472200c6c4eeeac6e76142bf4c23d0a5995d3d6d89ef92564736f6c634300081a0033"; // solhint-disable max-line-length

// TODO: We can also deploy the proxy with the ScrappyAccountFactory, it should work now
bytes constant PROXY_BYTECODE =
    hex"363d3d373d3d363d7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc545af43d6000803e6038573d6000fd5b3d6000f3";

contract HappyEntryPointGasEstimator is Test {
    using HappyTxLib for HappyTx;
    using MessageHashUtils for bytes32;

    // ====================================================================================================
    // CONSTANTS

    address private constant OWNER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address private constant DEST = 0x07b354EFA748883a342a9ba4780Cc9728f51e3D5;
    address private constant SCA = 0xb60849107b2B5C0F6e3bAEeC23FC3d2E43812632;
    address private constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;

    // ====================================================================================================
    // STATE VARIABLES

    DeployHappyAAContracts private deployer;
    MockERC20Token private mockERC20;
    HappyEntryPoint private happyEntryPoint;
    ScrappyAccount private scrappyAccount;
    ScrappyAccount private scrappyAccountImpl;
    ScrappyPaymaster private scrappyPaymaster;
    ScrappyAccountFactory private scrappyAccountFactory;

    // ====================================================================================================
    // COMMON SETUP

    function setUp() public {
        // Set up the Deployment Script
        deployer = new DeployHappyAAContracts();

        // Deploy the happy-aa contracts as foundry-account-0
        vm.prank(OWNER);
        deployer.deployForTests();

        happyEntryPoint = deployer.happyEntryPoint();
        scrappyPaymaster = deployer.scrappyPaymaster();
        scrappyAccountImpl = deployer.scrappyAccount();

        // Fund the smart account and paymaster with some gas tokens
        payable(address(SCA)).transfer(10 ether);
        payable(address(scrappyPaymaster)).transfer(10 ether);

        // Deploy a mock ERC20 token at the dest address
        vm.etch(DEST, MOCK_TOKEN_BYTECODE);

        // TODO: instead of the below setup, I can deploy a new proxy with the ScrappyAccountFactory, and use a state variable
        // TODO: to store the address of the proxy. This would be more direct, but makes the getHappyTx functions `view` instead
        // TODO: of `pure`. Which ig isn't an issue at all, but I'm just leaving it like this for now.

        // Deploy and initialize the proxy for scrappy account
        vm.etch(SCA, PROXY_BYTECODE);
        vm.store(
            SCA,
            0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc,
            bytes32(uint256(uint160(address(scrappyAccountImpl))))
        );
        ScrappyAccount(payable(SCA)).initialize(OWNER);
    }

    // ====================================================================================================
    // SELF-PAYING HAPPY TX GAS ESTIMATION

    /**
     * @notice Measures gas usage for submitting transactions through the EntryPoint, analyzing
     * different storage access patterns:
     * 1. Cold + uninitialized storage access (first ever transaction)
     * 2. Cold + initialized storage access (subsequent transactions in different blocks)
     * 3. Warm storage access (multiple transactions in same block)
     *
     * This test estimates gas consumption for:
     * 1. Initial transaction with uninitialized storage slots (worst case)
     * 2. Subsequent transaction with initialized but cold storage slots
     * 3. Multiple transactions in same block benefiting from warm storage (better case?)
     */
    function testEstimateEntryPointSubmitGas() public {
        console.log("\nHappyEntryPoint Gas Report");

        // Step 1. Submit the encoded happy tx (uninitialized and cold storage)
        console.log("\n1. First Transaction (Cold + Uninitialized Storage)");
        console.log(" ----------------------------------------------------");
        HappyTx memory happyTx1 = _createSignedHappyTx(SCA, SCA, 0);
        uint256 gasUninitialized = this._estimateEPSubmitGas(happyTx1.encode());
        console.log("   Tx Gas used: ", gasUninitialized);

        // Step 2. Submit the encoded happy tx (initialized and cold storage)
        console.log("\n2. Second Transaction (Cold + Initialized Storage)");
        console.log(" ----------------------------------------------------");
        HappyTx memory happyTx2 = _createSignedHappyTx(SCA, SCA, 1);
        uint256 gasCold = this._estimateEPSubmitGas(happyTx2.encode());
        console.log("   TxGas used: ", gasCold);

        // Step 3. Submit multiple txs in same call to measure warm storage access
        console.log("\n3. Batch Transactions (Warm Storage Access)");
        console.log(" ----------------------------------------------------");

        // Create array of transactions
        HappyTx[] memory warmTxs = new HappyTx[](2);
        warmTxs[0] = _createSignedHappyTx(SCA, SCA, 2);
        warmTxs[1] = _createSignedHappyTx(SCA, SCA, 3);

        // Encode the transactions
        bytes[] memory encodedWarmTxs = new bytes[](warmTxs.length);
        for (uint256 i = 0; i < warmTxs.length; i++) {
            encodedWarmTxs[i] = warmTxs[i].encode();
        }
        // Submit the transactions
        uint256[] memory gasUsedWarm = this._estimateEPGasForMultipleTxs(encodedWarmTxs);
        console.log("   Tx Gas used (2nd txn): ", gasUsedWarm[1]);
    }

    function testEstimateScrappyAccountPayoutGas() public {
        console.log("\nScrappyAccount payout gas usage");
        console.log(" ----------------------------------------------------");
        vm.prank(address(happyEntryPoint));
        HappyTx memory happyTx = _createSignedHappyTx(SCA, ZERO_ADDRESS, 0);
        ScrappyAccount(payable(SCA)).payout(happyTx, 0);
        // console.log("   payout internal gas used: ", gasUsed);
    }

    // ====================================================================================================
    // PAYMASTER-SPONSORED HAPPY TXs

    function testEstimateScrappyPaymasterPayoutGas() public {
        console.log("\nScrappyPaymaster payout gas usage");
        console.log(" ----------------------------------------------------");
        vm.prank(address(happyEntryPoint));
        HappyTx memory happyTx = _createSignedHappyTx(SCA, ZERO_ADDRESS, 0);
        scrappyPaymaster.payout(happyTx, 0);
        // console.log("   payout internal gas used: ", gasUsed);
    }

    // ====================================================================================================
    // GAS ESTIMATION UTILS

    /// @dev Internal function to estimate gas used by `submit` for a single happy tx.
    /// This function is used when each call is executed as a separate transaction (due to `--isolate` flag).
    function _estimateEPSubmitGas(bytes memory encodedHappyTx) external returns (uint256) {
        uint256 gasBefore = gasleft();
        happyEntryPoint.submit(encodedHappyTx);
        uint256 gasAfter = gasleft();

        return gasBefore - gasAfter;
    }

    /// @dev Internal function to submit multiple transactions and measure gas for each.
    /// This function is used to measure gas usage when submitting multiple transactions in a single call.
    function _estimateEPGasForMultipleTxs(bytes[] memory encodedHappyTxs) external returns (uint256[] memory) {
        uint256[] memory gasUsedArray = new uint256[](encodedHappyTxs.length);

        for (uint256 i = 0; i < encodedHappyTxs.length; i++) {
            uint256 start = gasleft();
            happyEntryPoint.submit(encodedHappyTxs[i]);
            uint256 end = gasleft();
            gasUsedArray[i] = start - end;
        }

        return gasUsedArray;
    }

    // ====================================================================================================
    // HAPPY TX CREATION UTILS

    /// @dev Internal helper function to sign a happy tx.
    function signHappyTx(HappyTx memory happyTx) internal pure returns (bytes memory signature) {
        bytes32 hash = keccak256(happyTx.encode()).toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) =
            vm.sign(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80, hash);
        signature = abi.encodePacked(r, s, v);
    }

    /// @dev Internal helper function to create a signed happy tx.
    function _createSignedHappyTx(address account, address paymaster, uint256 nonce)
        internal
        pure
        returns (HappyTx memory)
    {
        HappyTx memory happyTx = _getStubHappyTx();

        happyTx.account = account;
        happyTx.paymaster = paymaster;
        happyTx.nonceTrack = 0;
        happyTx.nonceValue = uint64(nonce);

        happyTx.validatorData = signHappyTx(happyTx);
        return happyTx;
    }

    /// @dev Internal helper function to create a stub happy tx. The callData is `mint` call to a token at `dest`.
    function _getStubHappyTx() internal pure returns (HappyTx memory) {
        return HappyTx({
            account: 0x0000000000000000000000000000000000000000, // Stub value
            gasLimit: 4000000000, // 0xEE6B2800
            executeGasLimit: 4000000000, // 0xEE6B2800
            dest: DEST,
            paymaster: 0x0000000000000000000000000000000000000000, // Stub value
            value: 0,
            nonceTrack: 0,
            nonceValue: 0,
            maxFeePerGas: 1200000000, // 0x47868C00
            submitterFee: 100, // 0x64
            callData: hex"40c10f19000000000000000000000000b60849107b2b5c0f6e3baeec23fc3d2e4381263200000000000000000000000000000000000000000000000000038d7ea4c68000",
            paymasterData: hex"",
            validatorData: hex"",
            extraData: hex""
        });
    }
}
