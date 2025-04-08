// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ECDSA} from "solady/utils/ECDSA.sol";

import {BoopTestUtils} from "../Utils.sol";
import {MockERC20} from "../../../mocks/MockERC20.sol";
import {MockRevert} from "../../../mocks/MockRevert.sol";
import {MockHappyAccount} from "../../../test/mocks/MockHappyAccount.sol";

import {Boop} from "boop/core/Boop.sol";
import {BoopLib} from "boop/libs/BoopLib.sol";
import {
    SessionKeyValidator, AccountPaidSessionKeyBoop, InvalidSignature
} from "boop/extensions/SessionKeyValidator.sol";

import {DeployBoopContracts} from "../../../deploy/DeployBoop.s.sol";

contract SessionKeyValidatorTest is BoopTestUtils {
    using ECDSA for bytes32;
    using BoopLib for Boop;

    bytes32 private constant SALT = 0;
    bytes32 private constant SALT2 = bytes32(uint256(1));
    address private constant ZERO_ADDRESS = address(0);
    uint256 private constant INITIAL_DEPOSIT = 10 ether;

    // ====================================================================================================
    // STATE VARIABLES

    DeployBoopContracts private deployer;

    address private smartAccount;
    address private sessionKeyValidator;
    uint256 private privKey;
    uint256 private sessionKey;
    address private publicKey;
    address private owner;
    address private dest;
    address private mockToken;
    address private mockRevert;
    address private mockAccount;

    // ====================================================================================================
    // SETUP

    function setUp() public {
        privKey = uint256(vm.envBytes32("PRIVATE_KEY_LOCAL"));
        owner = vm.addr(privKey);
        sessionKey = 0xdeadbeefdeadbeef;
        publicKey = vm.addr(sessionKey);

        // Set up the Deployment Script, and deploy the boop contracts as foundry-account-0
        deployer = new DeployBoopContracts();
        vm.prank(owner);
        deployer.deployForTests();

        entryPoint = deployer.entryPoint();
        smartAccount = deployer.happyAccountFactory().createAccount(SALT, owner);
        dest = deployer.happyAccountFactory().createAccount(SALT2, owner);

        // Fund the smart account
        vm.deal(smartAccount, INITIAL_DEPOSIT);

        // Deploy a mock ERC20 token, and a mock token that always reverts
        mockToken = address(new MockERC20("MockTokenA", "MTA", uint8(18)));
        mockRevert = address(new MockRevert());

        // Deploy the SessionKeyValidator
        sessionKeyValidator = address(new SessionKeyValidator());

        // Deploy the MockHappyAccount
        mockAccount = address(new MockHappyAccount());
    }

    // ====================================================================================================
    // TESTS

    function testAddRemoveSessionKey() public {
        // Test Case 1: Cannot register session key for validator itself
        vm.prank(smartAccount);
        vm.expectRevert(abi.encodeWithSelector(SessionKeyValidator.CannotRegisterSessionKeyForValidator.selector));
        SessionKeyValidator(sessionKeyValidator).addSessionKey(sessionKeyValidator, publicKey);

        // Test Case 2: Cannot register session key for account itself
        vm.prank(smartAccount);
        vm.expectRevert(abi.encodeWithSelector(SessionKeyValidator.CannotRegisterSessionKeyForAccount.selector));
        SessionKeyValidator(sessionKeyValidator).addSessionKey(smartAccount, publicKey);

        // Test Case 3: Successfully add a session key
        vm.prank(smartAccount);
        SessionKeyValidator(sessionKeyValidator).addSessionKey(dest, publicKey);

        // Verify the session key was added correctly
        address storedSessionKey = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, dest);
        assertEq(storedSessionKey, publicKey, "Session key not stored correctly");

        // Test Case 4: Add multiple session keys at once
        address[] memory targets = new address[](2);
        targets[0] = mockToken;
        targets[1] = mockRevert;

        address[] memory keys = new address[](2);
        keys[0] = vm.addr(0xB0B0);
        keys[1] = vm.addr(0xC0C0);

        vm.prank(smartAccount);
        SessionKeyValidator(sessionKeyValidator).addSessionKeys(targets, keys);

        // Verify multiple session keys were added correctly
        address storedSessionKey1 = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, targets[0]);
        address storedSessionKey2 = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, targets[1]);
        assertEq(storedSessionKey1, keys[0], "First session key not stored correctly");
        assertEq(storedSessionKey2, keys[1], "Second session key not stored correctly");

        // Test Case 5: Remove multiple session keys at once
        vm.prank(smartAccount);
        SessionKeyValidator(sessionKeyValidator).removeSessionKeys(targets);

        // Verify multiple session keys were removed correctly
        storedSessionKey1 = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, targets[0]);
        storedSessionKey2 = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, targets[1]);
        assertEq(storedSessionKey1, address(0), "First session key not removed correctly");
        assertEq(storedSessionKey2, address(0), "Second session key not removed correctly");

        // Verify the first session key (dest) is still there (not removed)
        storedSessionKey = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, dest);
        assertEq(storedSessionKey, publicKey, "Original session key should not be removed");

        // Test Case 6: Remove a single session key
        vm.prank(smartAccount);
        SessionKeyValidator(sessionKeyValidator).removeSessionKey(dest);

        // Verify the session key was removed
        storedSessionKey = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, dest);
        assertEq(storedSessionKey, address(0), "Session key not removed correctly");
    }

    function testValidateWithValidSignature() public {
        // Add a session key
        vm.prank(smartAccount);
        SessionKeyValidator(sessionKeyValidator).addSessionKey(dest, publicKey);

        // Create a valid Boop
        Boop memory boop = createSignedBoopForMintToken(smartAccount, dest, smartAccount, mockToken, privKey);

        // Call validate
        vm.prank(smartAccount);
        bytes memory result = SessionKeyValidator(sessionKeyValidator).validate(boop);

        // Should return empty bytes4(0) for success
        assertEq(result, abi.encodeWithSelector(bytes4(0)));
    }

    function testValidateWithInvalidSignature() public {
        // Add a session key
        vm.prank(smartAccount);
        SessionKeyValidator(sessionKeyValidator).addSessionKey(dest, publicKey);

        // Create a valid Boop
        Boop memory boop = createSignedBoop(smartAccount, dest, ZERO_ADDRESS, uint256(0x2222), new bytes(0));

        // Call validate
        vm.prank(smartAccount);
        bytes memory result = SessionKeyValidator(sessionKeyValidator).validate(boop);

        // Should return InvalidSignature selector
        assertEq(result, abi.encodeWithSelector(InvalidSignature.selector));
    }

    function testValidateWithAccountPaidBoop() public {
        // Add a session key
        vm.prank(smartAccount);
        SessionKeyValidator(sessionKeyValidator).addSessionKey(dest, publicKey);

        // Create a Boop where account is also the paymaster (self-paying)
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));

        // Call validate
        vm.prank(smartAccount);
        bytes memory result = SessionKeyValidator(sessionKeyValidator).validate(boop);

        // Should return AccountPaidSessionKeyBoop selector
        assertEq(result, abi.encodeWithSelector(AccountPaidSessionKeyBoop.selector));
    }

    // ====================================================================================================
    // HELPER FUNCTIONS

    /// @dev Helper function to get the toEthSignedMessageHash function from ECDSA
    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}
