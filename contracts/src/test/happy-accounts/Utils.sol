// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {HappyTx} from "../../happy-accounts/core/HappyTx.sol";
import {HappyTxLib} from "../../happy-accounts/libs/HappyTxLib.sol";
import {ScrappyAccount} from "../../happy-accounts/samples/ScrappyAccount.sol";
import {MockERC20} from "../../mocks/MockERC20.sol";

/// Common utility functions for HappyAccounts unit tests
contract HappyTxTestUtils is Test {
    using HappyTxLib for HappyTx;
    using MessageHashUtils for bytes32;

    uint256 public constant TOKEN_MINT_AMOUNT = 1000;
    uint192 public constant DEFAULT_NONCETRACK = 1;

    // ====================================================================================================
    // HAPPY TX HELPERS

    function createSignedHappyTxForMintToken(
        address account,
        address mintTokenTo,
        address paymaster,
        address token,
        uint256 privKey
    ) public view returns (HappyTx memory happyTx) {
        bytes memory mintCallData = getMintTokenCallData(mintTokenTo, TOKEN_MINT_AMOUNT);
        happyTx = createSignedHappyTx(account, token, paymaster, privKey, mintCallData);
    }

    function createSignedHappyTx(
        address account,
        address dest,
        address paymaster,
        uint256 privKey,
        bytes memory callData
    ) public view returns (HappyTx memory happyTx) {
        happyTx = getStubHappyTx(account, dest, paymaster, callData);
        happyTx.validatorData = signHappyTx(happyTx, privKey);
    }

    function getStubHappyTx(address _account, address _dest, address _paymaster, bytes memory _callData)
        public
        view
        returns (HappyTx memory)
    {
        return HappyTx({
            account: _account,
            gasLimit: 4000000000,
            executeGasLimit: 4000000000,
            dest: _dest,
            paymaster: _paymaster,
            value: 0,
            nonceTrack: DEFAULT_NONCETRACK,
            nonceValue: getNonceValue(_account),
            maxFeePerGas: 1200000000,
            submitterFee: 100,
            callData: _callData,
            paymasterData: hex"",
            validatorData: hex"",
            extraData: hex""
        });
    }

    function signHappyTx(HappyTx memory happyTx, uint256 privKey) public pure returns (bytes memory signature) {
        // Store the original gas values
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

        bytes32 hash = keccak256(happyTx.encode()).toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, hash);
        signature = abi.encodePacked(r, s, v);

        if (happyTx.paymaster != happyTx.account) {
            // Restore the original gas values after signing
            happyTx.gasLimit = origGasLimit;
            happyTx.executeGasLimit = origExecuteGasLimit;
            happyTx.maxFeePerGas = origMaxFeePerGas;
            happyTx.submitterFee = origSubmitterFee;
        }
    }

    // ====================================================================================================
    // CALLDATA HELPERS

    function getMintTokenCallData(address mintTokenTo, uint256 amount) public pure returns (bytes memory) {
        return abi.encodeCall(MockERC20.mint, (mintTokenTo, amount));
    }

    function getETHTransferCallData(address transferTo, uint256 amount) public pure returns (bytes memory) {
        return abi.encodeWithSignature("transfer(address, uint256)", transferTo, amount);
    }

    function getMockTokenAlwaysRevertCallData() public pure returns (bytes memory) {
        return abi.encodeCall(MockERC20.alwaysRevert, ());
    }

    function getMockTokenAlwaysRevertEmptyCallData() public pure returns (bytes memory) {
        return abi.encodeCall(MockERC20.alwaysRevertEmpty, ());
    }

    // ====================================================================================================
    // NONCE HELPERS

    function getNonceValue(address smartAccount) public view returns (uint64) {
        return uint64(ScrappyAccount(payable(smartAccount)).nonceValue(DEFAULT_NONCETRACK));
    }

    function getNonceValue(address smartAccount, uint192 nonceTrack) public view returns (uint64) {
        return uint64(ScrappyAccount(payable(smartAccount)).nonceValue(nonceTrack));
    }

    // ====================================================================================================
    // OTHER HELPERS

    function getTokenBalance(address token, address account) public view returns (uint256) {
        return MockERC20(token).balanceOf(account);
    }

    function getEthBalance(address account) public view returns (uint256) {
        return address(account).balance;
    }
}
