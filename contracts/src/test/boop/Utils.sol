// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import {Boop} from "boop/core/Boop.sol";
import {BoopLib} from "boop/libs/BoopLib.sol";
import {MockERC20} from "../../mocks/MockERC20.sol";
import {MockRevert} from "../../mocks/MockRevert.sol";
import {EntryPoint} from "boop/core/EntryPoint.sol";

/// Common utility functions for Boop unit tests
contract BoopTestUtils is Test {
    using BoopLib for Boop;
    using MessageHashUtils for bytes32;

    uint256 public constant TOKEN_MINT_AMOUNT = 1000;
    uint192 public constant DEFAULT_NONCETRACK = type(uint192).max;

    // To be initialized by subclasses.
    EntryPoint public entryPoint;

    // ====================================================================================================
    // BOOP HELPERS

    function createSignedBoopForMintToken(
        address account,
        address mintTokenTo,
        address paymaster,
        address token,
        uint256 privKey
    ) public view returns (Boop memory boop) {
        bytes memory mintCallData = getMintTokenCallData(mintTokenTo, TOKEN_MINT_AMOUNT);
        boop = createSignedBoop(account, token, paymaster, privKey, mintCallData);
    }

    function createSignedBoop(address account, address dest, address paymaster, uint256 privKey, bytes memory callData)
        public
        view
        returns (Boop memory boop)
    {
        boop = getStubBoop(account, dest, paymaster, callData);
        boop.validatorData = signBoop(boop, privKey);
    }

    function getStubBoop(address _account, address _dest, address _paymaster, bytes memory _callData)
        public
        view
        returns (Boop memory)
    {
        return Boop({
            account: _account,
            gasLimit: 4000000000,
            executeGasLimit: 4000000000,
            validateGasLimit: 4000000000,
            validatePaymentGasLimit: 4000000000,
            dest: _dest,
            paymaster: _paymaster,
            value: 0,
            nonceTrack: DEFAULT_NONCETRACK,
            nonceValue: entryPoint.nonceValues(_account, DEFAULT_NONCETRACK),
            maxFeePerGas: 1200000000,
            submitterFee: 100,
            callData: _callData,
            paymasterData: "",
            validatorData: "",
            extraData: ""
        });
    }

    function signBoop(Boop memory boop, uint256 privKey) public pure returns (bytes memory signature) {
        // Store the original gas values
        uint32 origGasLimit;
        uint32 origValidateGasLimit;
        uint32 origValidatePaymentGasLimit;
        uint32 origExecuteGasLimit;
        uint256 origMaxFeePerGas;
        int256 origSubmitterFee;
        // Store original validator data (normally we'll use the signature to erase this)
        bytes memory origValidatorData;

        if (boop.paymaster != boop.account) {
            // If the boop is not self-paying, we don't sign over the gas values
            origGasLimit = boop.gasLimit;
            origValidateGasLimit = boop.validateGasLimit;
            origValidatePaymentGasLimit = boop.validatePaymentGasLimit;
            origExecuteGasLimit = boop.executeGasLimit;
            origMaxFeePerGas = boop.maxFeePerGas;
            origSubmitterFee = boop.submitterFee;

            // Temporarily make them zero to not sign over them
            boop.gasLimit = 0;
            boop.validateGasLimit = 0;
            boop.validatePaymentGasLimit = 0;
            boop.executeGasLimit = 0;
            boop.maxFeePerGas = 0;
            boop.submitterFee = 0;
        }
        boop.validatorData = ""; // erase existing signature if any

        bytes32 hash = keccak256(boop.encode()).toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privKey, hash);
        signature = abi.encodePacked(r, s, v);

        if (boop.paymaster != boop.account) {
            // Restore the original gas values after signing
            boop.gasLimit = origGasLimit;
            boop.validateGasLimit = origValidateGasLimit;
            boop.validatePaymentGasLimit = origValidatePaymentGasLimit;
            boop.executeGasLimit = origExecuteGasLimit;
            boop.maxFeePerGas = origMaxFeePerGas;
            boop.submitterFee = origSubmitterFee;
        }
        boop.validatorData = origValidatorData;
    }

    // ====================================================================================================
    // CALLDATA HELPERS

    function getMintTokenCallData(address mintTokenTo, uint256 amount) public pure returns (bytes memory) {
        return abi.encodeCall(MockERC20.mint, (mintTokenTo, amount));
    }

    function getETHTransferCallData(address transferTo, uint256 amount) public pure returns (bytes memory) {
        return abi.encodeWithSignature("transfer(address, uint256)", transferTo, amount);
    }

    function getMockRevertCallData() public pure returns (bytes memory) {
        return abi.encodeCall(MockRevert.intentionalRevert, ());
    }

    function getMockRevertEmptyCallData() public pure returns (bytes memory) {
        return abi.encodeCall(MockRevert.intentionalRevertEmpty, ());
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
