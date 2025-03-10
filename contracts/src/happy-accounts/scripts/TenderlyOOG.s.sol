// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";

import {MockERC20} from "../../mocks/MockERC20.sol";
import {BurnAllGas} from "../../test/mocks/BurnAllGas.sol";

import {HappyTx} from "../../happy-accounts/core/HappyTx.sol";
import {HappyTxLib} from "../../happy-accounts/libs/HappyTxLib.sol";

import {HappyEntryPoint} from "../core/HappyEntryPoint.sol";
import {ScrappyAccount} from "../samples/ScrappyAccount.sol";
import {DeployHappyAAContracts} from "../../deploy/DeployHappyAA.s.sol";

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

    // ====================================================================================================
    // STATE VARIABLES

    DeployHappyAAContracts private deployer;
    HappyEntryPoint private happyEntryPoint;

    address private smartAccount;
    address private paymaster;

    uint256 private privKey;
    address private owner;
    address private dest;

    address private mockToken;
    address private burnAllGas;

    function run() external {
        setUp();
        executeWithLowExecutionGasLimitOOG();
    }

    function setUp() public {
        privKey = uint256(vm.envBytes32("PRIVATE_KEY_LOCAL"));
        owner = vm.addr(privKey);

        // Set up the Deployment Script, and deploy the happy-aa contracts as foundry-account-0
        deployer = new DeployHappyAAContracts();
        vm.prank(owner);
        deployer.deployForTests();

        happyEntryPoint = deployer.happyEntryPoint();
        paymaster = address(deployer.scrappyPaymaster());
        smartAccount = deployer.scrappyAccountFactory().createAccount(SALT, owner);

        dest = deployer.scrappyAccountFactory().createAccount(SALT2, owner);

        // Fund the smart account and paymaster
        vm.deal(paymaster, INITIAL_DEPOSIT);
        vm.deal(smartAccount, INITIAL_DEPOSIT);

        // Deploy a mock ERC20 token
        mockToken = address(new MockERC20("MockTokenA", "MTA", uint8(18)));

        // Deploy a mock contract that burns all gas
        burnAllGas = address(new BurnAllGas());
    }

    function executeWithLowExecutionGasLimitOOG() public {
        HappyTx memory happyTx =
            getStubHappyTx(smartAccount, mockToken, ZERO_ADDRESS, getMintTokenCallData(dest, TOKEN_MINT_AMOUNT));

        // Enough to reach MockERC20.mint, but still runs out of gas.
        happyTx.executeGasLimit = 100000;

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

        // Submit the transaction
        happyEntryPoint.submit(happyTx.encode());
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
