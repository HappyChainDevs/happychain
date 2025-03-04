// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {HappyTx} from "../../happy-accounts/core/HappyTx.sol";
import {HappyTxLib} from "../../happy-accounts/libs/HappyTxLib.sol";
import {ScrappyAccount} from "../../happy-accounts/samples/ScrappyAccount.sol";
import {MockERC20Token} from "../../mocks/MockERC20.sol";

/// Common utility functions for HappyAccounts unit tests
contract HappyTxTestUtils is Test {
    using HappyTxLib for HappyTx;
    using MessageHashUtils for bytes32;

    uint256 private constant TOKEN_MINT_AMOUNT = 10;
    uint192 private constant DEFAULT_NONCETRACK = 0;

    function createSignedHappyTxForMint(address account, address paymaster, address dest, uint256 privKey)
        public
        view
        returns (HappyTx memory)
    {
        bytes memory callData = getMintCallData(dest, TOKEN_MINT_AMOUNT);
        return createSignedHappyTx(account, paymaster, dest, privKey, callData);
    }

    function createSignedHappyTx(
        address account,
        address paymaster,
        address dest,
        uint256 privKey,
        bytes memory callData
    ) public view returns (HappyTx memory) {
        HappyTx memory happyTx = getStubHappyTx(dest, callData);

        happyTx.account = account;
        happyTx.paymaster = paymaster;
        happyTx.nonceTrack = 0;
        happyTx.nonceValue = getNonce(account, DEFAULT_NONCETRACK);

        // Store original values
        uint32 origGasLimit;
        uint32 origExecuteGasLimit;
        uint256 origMaxFeePerGas;
        int256 origSubmitterFee;

        if (paymaster != account) {
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

        happyTx.validatorData = signHappyTx(happyTx, privKey);

        if (paymaster != account) {
            // Restore original values after signing
            happyTx.gasLimit = origGasLimit;
            happyTx.executeGasLimit = origExecuteGasLimit;
            happyTx.maxFeePerGas = origMaxFeePerGas;
            happyTx.submitterFee = origSubmitterFee;
        }

        return happyTx;
    }

    function getStubHappyTx(address _dest, bytes memory _callData) public pure returns (HappyTx memory) {
        return HappyTx({
            account: address(0), // Stub value
            gasLimit: 4000000000, // 0xEE6B2800
            executeGasLimit: 4000000000, // 0xEE6B2800
            dest: _dest,
            paymaster: address(0), // Stub value
            value: 0,
            nonceTrack: 0,
            nonceValue: 0,
            maxFeePerGas: 1200000000, // 0x47868C00
            submitterFee: 100, // 0x64
            callData: _callData,
            paymasterData: hex"",
            validatorData: hex"",
            extraData: hex""
        });
    }

    function signHappyTx(HappyTx memory happyTx, uint256 privKey) public pure returns (bytes memory signature) {
        bytes32 hash = keccak256(happyTx.encode()).toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, hash);
        signature = abi.encodePacked(r, s, v);
    }

    function getMintCallData(address target, uint256 amount) public pure returns (bytes memory) {
        return abi.encodeCall(MockERC20Token.mint, (target, amount));
    }

    function getNonce(address smartAccount, uint192 nonceTrack) public view returns (uint64) {
        return uint64(ScrappyAccount(payable(smartAccount)).getNonce(nonceTrack));
    }
}
