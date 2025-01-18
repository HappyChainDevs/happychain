// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";
import {PackedUserOperation} from "kernel/interfaces/PackedUserOperation.sol";
import {SIG_VALIDATION_SUCCESS_UINT, SIG_VALIDATION_FAILED_UINT} from "kernel/types/Constants.sol";

import {MockERC20Token} from "../mocks/MockERC20.sol";
import {SessionKeyValidator} from "../../src/SessionKeyValidator.sol";

contract SessionValidatorTest is Test {
    SessionKeyValidator public sessionKeyValidator;
    MockERC20Token public token;

    function setUp() public {
        sessionKeyValidator = new SessionKeyValidator();
        token = new MockERC20Token("MockToken", "MTK", 18);
    }

    struct PartialPackedUserOperation {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        bytes32 accountGasLimits;
        uint256 preVerificationGas;
        bytes32 gasFees; //maxPriorityFee and maxFeePerGas;
        bytes paymasterAndData;
    }

    function testValidateUserOp() public {
        // create user
        (address alice,) = makeAddrAndKey("alice");

        // create session key
        (address sessionKey, uint256 sessionKeyPk) = makeAddrAndKey("sessionKey");

        // call onInstall
        bytes memory onInstallData = abi.encodePacked(sessionKey, token);
        sessionKeyValidator.onInstall(onInstallData);
        assert(sessionKeyValidator.initialized(address(this)));

        // construct calldata for MockToken.mint()
        bytes memory mintCallData = abi.encodeWithSignature("mint(address,uint256)", alice, 0.01 ether);

        // prefix with mockToken address
        mintCallData = abi.encodePacked(token, mintCallData);

        // prefix calldata with handleUserOp()
        // ExecMode execMode (=0), bytes calldata executionCalldata
        bytes memory executeCalldata = abi.encodeWithSignature("execute(bytes32,bytes)", 0, mintCallData);

        // create packed userOp without signature
        PartialPackedUserOperation memory partialUserOp = PartialPackedUserOperation({
            sender: alice,
            nonce: 0,
            initCode: hex"",
            callData: executeCalldata,
            accountGasLimits: hex"",
            preVerificationGas: 0,
            gasFees: hex"",
            paymasterAndData: hex""
        });
        // sign userOp
        bytes32 userOpHash = _getPackedUserOpHash(partialUserOp);
        bytes32 ethHash = ECDSA.toEthSignedMessageHash(userOpHash);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sessionKeyPk, ethHash);

        // insert signature into userOp
        PackedUserOperation memory userOpWithSignature = PackedUserOperation({
            sender: partialUserOp.sender,
            nonce: partialUserOp.nonce,
            initCode: partialUserOp.initCode,
            callData: partialUserOp.callData,
            accountGasLimits: partialUserOp.accountGasLimits,
            preVerificationGas: partialUserOp.preVerificationGas,
            gasFees: partialUserOp.gasFees,
            paymasterAndData: partialUserOp.paymasterAndData,
            signature: abi.encodePacked(r, s, v) // note: ordering
        });
        assertEq(sessionKeyValidator.validateUserOp(userOpWithSignature, userOpHash), SIG_VALIDATION_SUCCESS_UINT);

        // now failure case with bogus signer
        (, uint256 bogusSessionKeyPk) = makeAddrAndKey("bogusSessionKey");
        (v, r, s) = vm.sign(bogusSessionKeyPk, ethHash);
        PackedUserOperation memory userOpWithBogusSignature = PackedUserOperation({
            sender: partialUserOp.sender,
            nonce: partialUserOp.nonce,
            initCode: partialUserOp.initCode,
            callData: partialUserOp.callData,
            accountGasLimits: partialUserOp.accountGasLimits,
            preVerificationGas: partialUserOp.preVerificationGas,
            gasFees: partialUserOp.gasFees,
            paymasterAndData: partialUserOp.paymasterAndData,
            signature: abi.encodePacked(r, s, v) // note: ordering
        });
        assertEq(sessionKeyValidator.validateUserOp(userOpWithBogusSignature, userOpHash), SIG_VALIDATION_FAILED_UINT);
    }

    function testAddSessionKey() public {
        (address sessionKey,) = makeAddrAndKey("sessionKey");
        _addSessionKey(address(token), sessionKey);
        address sessionKeyLookup = sessionKeyValidator.sessionKeyValidatorStorage(
            sessionKeyValidator.getStorageKey(address(this), bytes20(address(token)))
        );

        assertEq(sessionKeyLookup, sessionKey);
    }

    function testRemoveSessionKey() public {
        (address sessionKey,) = makeAddrAndKey("sessionKey");
        _addSessionKey(address(token), sessionKey);
        address sessionKeyLookup = sessionKeyValidator.sessionKeyValidatorStorage(
            sessionKeyValidator.getStorageKey(address(this), bytes20(address(token)))
        );
        assertEq(sessionKeyLookup, sessionKey);
        // now remove
        sessionKeyValidator.removeSessionKey(address(token));
        sessionKeyLookup = sessionKeyValidator.sessionKeyValidatorStorage(
            sessionKeyValidator.getStorageKey(address(this), bytes20(address(token)))
        );
        assertEq(sessionKeyLookup, address(0));
    }

    // helper functions

    function _addSessionKey(address targetContract, address sessionKey) public {
        sessionKeyValidator.addSessionKey(targetContract, sessionKey);
    }

    function _getPackedUserOpHash(PartialPackedUserOperation memory userOp) private view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                userOp.sender,
                userOp.nonce,
                userOp.initCode,
                userOp.callData,
                userOp.accountGasLimits,
                userOp.preVerificationGas,
                userOp.gasFees,
                userOp.paymasterAndData,
                _getChainId()
            )
        );
    }

    function _getChainId() private view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }
}
