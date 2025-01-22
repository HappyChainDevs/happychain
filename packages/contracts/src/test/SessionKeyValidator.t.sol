// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";
import {PackedUserOperation} from "kernel/interfaces/PackedUserOperation.sol";
import {SIG_VALIDATION_SUCCESS_UINT, SIG_VALIDATION_FAILED_UINT} from "kernel/types/Constants.sol";

import {MockERC20Token} from "../mocks/MockERC20.sol";
import {SessionKeyValidator} from "../../src/SessionKeyValidator.sol";
import {SessionKeyValidatorUpgraded} from "./mocks/SessionKeyValidatorUpgraded.sol";

// imported for _deployProxy, todo: use DeployAA.s.sol in entirety for tests
import {DeployAAContracts} from "../../src/deploy/DeployAA.s.sol";

contract SessionValidatorTest is Test, DeployAAContracts {
    SessionKeyValidator public sessionKeyValidator;
    MockERC20Token public mockToken;

    function setUp() public {
        sessionKeyValidator = SessionKeyValidator(
            _deployProxy(
                address(new SessionKeyValidator()),
                abi.encodeWithSelector(SessionKeyValidator.initialize.selector, address(this)),
                bytes32(0)
            )
        );
        mockToken = new MockERC20Token("MockToken", "MTK", 18);
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
        bytes memory onInstallData = abi.encodePacked(sessionKey, mockToken);
        sessionKeyValidator.onInstall(onInstallData);
        assert(sessionKeyValidator.initialized(address(this)));

        // construct calldata for MockToken.mint()
        bytes memory mintCallData = abi.encodeWithSignature("mint(address,uint256)", alice, 0.01 ether);

        // prefix with mockToken address
        mintCallData = abi.encodePacked(mockToken, mintCallData);

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
        _addSessionKey(address(mockToken), sessionKey);
        address sessionKeyLookup = sessionKeyValidator.sessionKeyValidatorStorage(
            sessionKeyValidator.getStorageKey(address(this), bytes20(address(mockToken)))
        );

        assertEq(sessionKeyLookup, sessionKey);
    }

    function testRemoveSessionKey() public {
        (address sessionKey,) = makeAddrAndKey("sessionKey");
        _addSessionKey(address(mockToken), sessionKey);
        address sessionKeyLookup = sessionKeyValidator.sessionKeyValidatorStorage(
            sessionKeyValidator.getStorageKey(address(this), bytes20(address(mockToken)))
        );
        assertEq(sessionKeyLookup, sessionKey);
        // now remove
        _removeSessionKey(address(mockToken));
        sessionKeyLookup = sessionKeyValidator.sessionKeyValidatorStorage(
            sessionKeyValidator.getStorageKey(address(this), bytes20(address(mockToken)))
        );
        assertEq(sessionKeyLookup, address(0));
    }

    function testUpgrade() public {
        address sessionKeyValidatorProxy = _deployProxy(
            address(new SessionKeyValidator()),
            abi.encodeWithSelector(SessionKeyValidator.initialize.selector, address(this)),
            bytes32(0)
        );
        address sessionKeyValidatorUpgraded = address(new SessionKeyValidatorUpgraded());

        address sessionKey = address(0x123);
        address[] memory sessionKeys = new address[](1);
        sessionKeys[0] = sessionKey;

        address targetContract = address(0x456);
        address[] memory targetContracts = new address[](1);
        targetContracts[0] = address(targetContract);

        // add session key
        SessionKeyValidator(sessionKeyValidatorProxy).addSessionKeys(targetContracts, sessionKeys);

        SessionKeyValidator(sessionKeyValidatorProxy).upgradeToAndCall(
            sessionKeyValidatorUpgraded,
            abi.encodeWithSelector(SessionKeyValidatorUpgraded.reinitialize.selector, address(this))
        );
        assertEq(
            SessionKeyValidatorUpgraded(address(sessionKeyValidatorProxy)).addedField(), "SessionKeyValidatorUpgraded"
        );

        // old methods still present + work (old storage still present, new storage persists)
        address sessionKeyLookup = SessionKeyValidator(sessionKeyValidatorProxy).sessionKeyValidatorStorage(
            SessionKeyValidator(sessionKeyValidatorProxy).getStorageKey(address(this), bytes20(targetContract))
        );
        assertEq(sessionKeyLookup, sessionKey);

        // now add new session key
        sessionKey = address(0x987);
        sessionKeys[0] = sessionKey;
        targetContract = address(0x678);
        targetContracts[0] = address(targetContract);
        SessionKeyValidator(sessionKeyValidatorProxy).addSessionKeys(targetContracts, sessionKeys);

        sessionKeyLookup = SessionKeyValidator(sessionKeyValidatorProxy).sessionKeyValidatorStorage(
            SessionKeyValidator(sessionKeyValidatorProxy).getStorageKey(address(this), bytes20(targetContract))
        );
        assertEq(sessionKeyLookup, sessionKey);
    }

    // helper functions
    function _addSessionKey(address targetContract, address sessionKey) public {
        address[] memory sessionKeys = new address[](1);
        sessionKeys[0] = address(sessionKey);
        address[] memory targetContracts = new address[](1);
        targetContracts[0] = targetContract;
        sessionKeyValidator.addSessionKeys(targetContracts, sessionKeys);
    }

    function _removeSessionKey(address targetContract) public {
        address[] memory targetContracts = new address[](1);
        targetContracts[0] = address(targetContract);
        sessionKeyValidator.removeSessionKeys(targetContracts);
    }

    function _getPackedUserOpHash(PartialPackedUserOperation memory userOp) private pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                userOp.sender,
                userOp.nonce,
                userOp.initCode,
                userOp.callData,
                userOp.accountGasLimits,
                userOp.preVerificationGas,
                userOp.gasFees,
                userOp.paymasterAndData
            )
        );
    }
}
