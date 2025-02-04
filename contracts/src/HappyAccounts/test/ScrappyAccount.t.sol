// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";

import {HappyTx} from "../core/HappyTx.sol";
import {HappyTxLib} from "../libs/HappyTxLib.sol";
import {ScrappyAccount} from "../samples/ScrappyAccount.sol";
import {ScrappyPaymaster} from "../samples/ScrappyPaymaster.sol";
import {ScrappyAccountFactory} from "../factories/ScrappyAccountFactory.sol";
import {HappyEntryPoint} from "../core/HappyEntryPoint.sol";
import {ScrappyAccountFactory} from "../factories/ScrappyAccountFactory.sol";
import {MockERC20Token} from "../../mocks/MockERC20.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";

contract ScrappyAccountTest is Test {
    using HappyTxLib for bytes;

    ScrappyAccount private testAccount;
    HappyEntryPoint private entryPoint;
    ScrappyAccountFactory private factory;
    ScrappyPaymaster private paymaster;
    MockERC20Token private token;
    bytes32 private SALT = "0x";

    address sender;
    uint256 senderPrivateKey;

    address submitter;
    uint256 submitterPrivateKey;

    struct PartialHappyTx {
        address account;
        address dest;
        address paymaster;
        uint256 value;
        uint256 nonce;
        bytes callData;
        bytes paymasterData;
        bytes validatorData;
    }

    function setUp() public {
        (address _sender, uint256 _senderPrivateKey) = makeAddrAndKey("Key");
        sender = _sender;
        senderPrivateKey = _senderPrivateKey;

        (address _submitter, uint256 _submitterPrivateKey) = makeAddrAndKey("Submitter");
        submitter = _submitter;
        submitterPrivateKey = _submitterPrivateKey;

        entryPoint = new HappyEntryPoint();
        paymaster = new ScrappyPaymaster();

        ScrappyAccount accountImplementation = new ScrappyAccount(address(entryPoint));
        factory = new ScrappyAccountFactory(address(accountImplementation), address(entryPoint));

        token = new MockERC20Token("MCK", "MCK", 18);

        testAccount = ScrappyAccount(payable(address(factory.createAccount(SALT, sender))));
    }

    function testCreateAccount() public {
        vm.expectRevert(ScrappyAccountFactory.AlreadyDeployed.selector);
        factory.createAccount(SALT, address(this));
    }

    function testSubmitSelfPaying() public {
        uint256 AMOUNT = 1000;
        uint256 initialBalance = token.balanceOf(address(this));
        vm.deal(address(testAccount), 1 ether); // fund the account since it sponsors itself

        HappyTx memory _tx = HappyTx({
            account: address(testAccount),
            gasLimit: 1000000,
            executeGasLimit: 800000,
            dest: address(token),
            paymaster: address(testAccount), // self sponsor
            value: 0,
            nonce: 0,
            maxFeePerGas: 2000000000,
            submitterFee: 100000000,
            callData: abi.encodeWithSignature("mint(address,uint256)", address(this), AMOUNT),
            paymasterData: hex"",
            validatorData: hex"",
            extraData: hex""
        });
        entryPoint.submit(_createHappyTx(_tx));

        assertEq(token.balanceOf(address(this)), initialBalance + AMOUNT);

        // bump nonce and send again
        _tx.nonce = 1;
        entryPoint.submit(_createHappyTx(_tx));
        assertEq(token.balanceOf(address(this)), initialBalance + (2 * AMOUNT));
    }

    function testSubmitSubmitterPays() public {
        vm.skip(true);
        uint256 AMOUNT = 1000;
        uint256 initialBalance = token.balanceOf(address(this));

        HappyTx memory _tx = HappyTx({
            account: address(testAccount),
            gasLimit: 1000000,
            executeGasLimit: 800000,
            dest: address(token),
            paymaster: address(0),
            value: 0,
            nonce: 0,
            maxFeePerGas: 2000000000,
            submitterFee: 100000000,
            callData: abi.encodeWithSignature("mint(address,uint256)", address(this), AMOUNT),
            paymasterData: hex"",
            validatorData: hex"",
            extraData: hex""
        });
        // sign with submitter
        (uint8 v, bytes32 r, bytes32 s) = _submitterSign(_tx);
        _tx.extraData = abi.encodePacked(r, s, v);
        entryPoint.submit(_tx);

        assertEq(token.balanceOf(address(this)), initialBalance + AMOUNT);

        //todo: ensure "early return" from submit() if (happyTx.paymaster == address(0)){
        // output.gas = uint32(consumedGas);
        // return output;}
    }

    function testWrongAccount() public {
        //todo: test when the account is not the sender (WrongAccount.selector;)
    }

    function testSimulationMode() public {
        //todo: test simulation mode - this could be done by vm.prank(address(0))
        // or whatever eth_call sets the tx.origin to
    }

    function testValidationReverted() public {
        // todo: implement all expected ValidationReverted cases
    }

    function testValidationFailed() public {
        //todo: implement all expected ValidationFailed cases
    }

    function testPaymentReverted() public {
        // todo: test when payment to paymaster reverts
    }

    function testCallReverted() public {
        //todo: test when call to dest reverts
        // can be done by calling a function that reverts,
        // for example: calling Token.transfer with too large a balance
    }

    function testPaymentFailed() public {
        //todo: test when payment to paymaster fails
    }

    function testParallelNonces() public {
        //todo: test sending transactions with keyed nonces
    }

    // Helper functions

    function _submitterSign(HappyTx memory _tx) internal view returns (uint8, bytes32, bytes32) {
        HappyTx memory submitterTx = HappyTx({
            account: _tx.account,
            gasLimit: 0,
            executeGasLimit: 0,
            dest: _tx.dest,
            paymaster: _tx.paymaster,
            value: _tx.value,
            nonce: _tx.nonce,
            maxFeePerGas: 0,
            submitterFee: 0,
            callData: _tx.callData,
            paymasterData: _tx.paymasterData,
            validatorData: _tx.validatorData,
            extraData: hex""
        });
        bytes32 hash = HappyTxLib.getHappyTxHash(submitterTx);
        console.logBytes32(hash);

        bytes32 ethHash = ECDSA.toEthSignedMessageHash(hash);
        console.logBytes32(ethHash);

        return vm.sign(submitterPrivateKey, ethHash);
    }

    function _createHappyTx(HappyTx memory _tx) internal view returns (HappyTx memory) {
        (uint8 v, bytes32 r, bytes32 s) = _signHappyTx(_tx);
        _tx.extraData = abi.encodePacked(r, s, v);
        return _tx;
    }

    function _signHappyTx(HappyTx memory _tx) internal view returns (uint8, bytes32, bytes32) {
        bytes32 hash = HappyTxLib.getHappyTxHash(_tx);
        bytes32 ethHash = ECDSA.toEthSignedMessageHash(hash);
        return vm.sign(senderPrivateKey, ethHash);
    }
}
