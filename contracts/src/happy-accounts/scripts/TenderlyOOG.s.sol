// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";

import {HappyTx} from "../../happy-accounts/core/HappyTx.sol";
import {HappyTxLib} from "../../happy-accounts/libs/HappyTxLib.sol";

import {MockERC20} from "../../mocks/MockERC20.sol";
import {HappyEntryPoint} from "../core/HappyEntryPoint.sol";
import {ScrappyAccount} from "../samples/ScrappyAccount.sol";
import {ScrappyAccountFactory} from "../factories/ScrappyAccountFactory.sol";

contract TenderlyOOG is Script {
    using ECDSA for bytes32;
    using HappyTxLib for HappyTx;

    // ====================================================================================================
    // CONSTANTS

    bytes32 private constant SALT = 0;
    bytes32 private constant SALT2 = bytes32(uint256(1));
    address private constant ZERO_ADDRESS = address(0);
    uint256 private constant INITIAL_DEPOSIT = 1000 ether;

    uint256 public constant TOKEN_MINT_AMOUNT = 1000;
    uint192 public constant DEFAULT_NONCETRACK = 0;

    uint256 private constant privKey = uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80);
    address private constant owner = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);

    // ====================================================================================================
    // STATE VARIABLES

    HappyEntryPoint private happyEntryPoint;

    // Easier to separately deploy the contract first, then copy paste these address from dep.json
    address private scrappyAccountFactory = 0x13b348F3EF330FC328Bb3cDa4261DCc43b62cB86;
    address private mockToken = 0xB42D31900E5F9b0b541C0e0ABBd6c52e69cDF07e;

    address private smartAccount = 0x16c0486AB97774be23bF85AcD8B5973A3f5e3AB8;
    address private dest = 0xB42D31900E5F9b0b541C0e0ABBd6c52e69cDF07e; // mockToken

    address private constant _happyEntryPoint = 0x47915b0147baB7d51b92dCbbc4baC0F3b82226f7;

    function run() external {
        setUp();
        executeWithLowExecutionGasLimitOOG();
    }

    function setUp() internal {
        vm.startBroadcast();
        // Foundry can't validate ERC1967 for some reason, so better to not deploy this in deployHappyAAA
        smartAccount = ScrappyAccountFactory(scrappyAccountFactory).createAccount(SALT2, owner);
        vm.stopBroadcast();
    }

    function executeWithLowExecutionGasLimitOOG() internal {
        HappyTx memory happyTx =
            getStubHappyTx(smartAccount, mockToken, ZERO_ADDRESS, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));

        // Enough to reach MockERC20.mint, but still runs out of gas.
        // happyTx.executeGasLimit = 40000;

        uint32 origGasLimit;
        uint32 origExecuteGasLimit;
        uint256 origMaxFeePerGas;
        int256 origSubmitterFee;

        if (happyTx.paymaster != happyTx.account) {
            // If the happy-tx is not self-paying, we don't sign over the gas values
            origGasLimit = happyTx.gasLimit;
            origExecuteGasLimit = happyTx.executeGasLimit;
            origMaxFeePerGas = happyTx.maxFeePerGas;
            origSubmitterFee = happyTx.submitterFee;

            // Temporarily make them zero to not sign over them
            happyTx.gasLimit = 0;
            happyTx.executeGasLimit = 0;
            happyTx.maxFeePerGas = 0;
            happyTx.submitterFee = 0;
        }

        happyTx.validatorData = signHappyTx(happyTx, privKey);

        if (happyTx.paymaster != happyTx.account) {
            // Restore the original gas values after signing
            happyTx.gasLimit = origGasLimit;
            happyTx.executeGasLimit = origExecuteGasLimit;
            happyTx.maxFeePerGas = origMaxFeePerGas;
            happyTx.submitterFee = origSubmitterFee;
        }

        // Don't broadcast the signing portion above, only broadcast the relevant "1" tx below
        vm.startBroadcast();
        HappyEntryPoint(_happyEntryPoint).submit(happyTx.encode());
        vm.stopBroadcast();
    }

    function getStubHappyTx(address _account, address _dest, address _paymaster, bytes memory _callData)
        public
        view
        returns (HappyTx memory)
    {
        return HappyTx({
            account: _account,
            gasLimit: 1_000_000,
            executeGasLimit: 1_000_000,
            dest: _dest,
            paymaster: _paymaster,
            value: 0,
            nonceTrack: 0,
            nonceValue: getNonce(_account),
            maxFeePerGas: 1200000000,
            submitterFee: 100,
            callData: _callData,
            paymasterData: hex"",
            validatorData: hex"",
            extraData: hex""
        });
    }

    function signHappyTx(HappyTx memory happyTx, uint256 _privKey) public pure returns (bytes memory signature) {
        bytes32 hash = keccak256(happyTx.encode()).toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(_privKey, hash);
        signature = abi.encodePacked(r, s, v);
    }

    // ====================================================================================================
    // CALLDATA HELPERS

    function getMintTokenCallData(address mintTokenTo, uint256 amount) public pure returns (bytes memory) {
        return abi.encodeCall(MockERC20.mint, (mintTokenTo, amount));
    }

    function getMockTokenAlwaysRevertCallData() public pure returns (bytes memory) {
        return abi.encodeCall(MockERC20.alwaysRevert, ());
    }

    function getMockTokenAlwaysRevertEmptyCallData() public pure returns (bytes memory) {
        return abi.encodeCall(MockERC20.alwaysRevertEmpty, ());
    }

    // ====================================================================================================
    // NONCE HELPERS

    function getNonce(address _smartAccount) public view returns (uint64) {
        return uint64(ScrappyAccount(payable(_smartAccount)).getNonce(DEFAULT_NONCETRACK));
    }
}
