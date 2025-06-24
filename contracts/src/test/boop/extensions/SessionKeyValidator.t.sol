// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Encoding} from "boop/core/Encoding.sol";
import {SessionKeyValidator, InvalidSignature} from "boop/extensions/SessionKeyValidator.sol";
import {Boop} from "boop/interfaces/Types.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";
import {DeployBoopContracts} from "src/deploy/DeployBoop.s.sol";
import {MockERC20} from "src/mocks/MockERC20.sol";
import {MockRevert} from "src/mocks/MockRevert.sol";
import {BoopTestUtils} from "src/test/boop/Utils.sol";
import {MockHappyAccount} from "src/test/mocks/MockHappyAccount.sol";

contract SessionKeyValidatorTest is BoopTestUtils {
    using ECDSA for bytes32;
    using Encoding for Boop;

    bytes32 private constant SALT = 0;
    bytes32 private constant SALT2 = bytes32(uint256(1));
    address private constant ZERO_ADDRESS = address(0);
    uint256 private constant INITIAL_DEPOSIT = 10 ether;

    // ====================================================================================================
    // STATE VARIABLES

    DeployBoopContracts private deployer;

    address private smartAccount;
    address private sessionKeyValidator;
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
        sessionKey = 0xdeadbeefdeadbeef;
        publicKey = vm.addr(sessionKey);

        deployer = new DeployBoopContracts();
        deployer.deployForTests();
        owner = deployer.owner();

        entryPoint = deployer.entryPoint();
        smartAccount = deployer.happyAccountBeaconProxyFactory().createAccount(SALT, owner);
        dest = deployer.happyAccountBeaconProxyFactory().createAccount(SALT2, owner);

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
        bool isValidKey = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, dest, publicKey);
        assertTrue(isValidKey, "Session key not stored correctly");

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
        bool isValidKey1 = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, targets[0], keys[0]);
        bool isValidKey2 = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, targets[1], keys[1]);
        assertTrue(isValidKey1, "First session key not stored correctly");
        assertTrue(isValidKey2, "Second session key not stored correctly");

        // Test Case 5: Remove multiple session keys at once
        vm.prank(smartAccount);
        SessionKeyValidator(sessionKeyValidator).removeSessionKeys(targets, keys);

        // Verify multiple session keys were removed correctly
        isValidKey1 = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, targets[0], keys[0]);
        isValidKey2 = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, targets[1], keys[1]);
        assertFalse(isValidKey1, "First session key not removed correctly");
        assertFalse(isValidKey2, "Second session key not removed correctly");

        // Verify the first session key (dest) is still there (not removed)
        isValidKey = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, dest, publicKey);
        assertTrue(isValidKey, "Original session key should not be removed");

        // Test Case 6: Remove a single session key
        vm.prank(smartAccount);
        SessionKeyValidator(sessionKeyValidator).removeSessionKey(dest, publicKey);

        // Verify the session key was removed
        isValidKey = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, dest, publicKey);
        assertFalse(isValidKey, "Session key not removed correctly");
    }

    function testValidateWithValidSignature() public {
        // Add a session key
        vm.prank(smartAccount);
        SessionKeyValidator(sessionKeyValidator).addSessionKey(dest, publicKey);

        // Create a valid Boop
        Boop memory boop = createSignedBoop(smartAccount, dest, ZERO_ADDRESS, sessionKey, new bytes(0));

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

        // Create a Boop where account is also the payer (self-paying)
        Boop memory boop = getStubBoop(smartAccount, dest, smartAccount, new bytes(0));

        // Call validate
        vm.prank(smartAccount);
        bytes memory result = SessionKeyValidator(sessionKeyValidator).validate(boop);

        // Should return AccountPaidSessionKeyBoop selector
        assertEq(result, abi.encodeWithSelector(SessionKeyValidator.AccountPaidSessionKeyBoop.selector));
    }

    function testMultipleSessionKeysForSameTarget() public {
        // Create multiple session keys
        uint256 sessionKey1 = 0xdeadbeef11111111;
        uint256 sessionKey2 = 0xdeadbeef22222222;
        address publicKey1 = vm.addr(sessionKey1);
        address publicKey2 = vm.addr(sessionKey2);

        // Add multiple session keys for the same target
        vm.startPrank(smartAccount);
        SessionKeyValidator(sessionKeyValidator).addSessionKey(dest, publicKey1);
        SessionKeyValidator(sessionKeyValidator).addSessionKey(dest, publicKey2);
        vm.stopPrank();

        // Verify both session keys are valid
        bool isValidKey1 = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, dest, publicKey1);
        bool isValidKey2 = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, dest, publicKey2);
        assertTrue(isValidKey1, "First session key not stored correctly");
        assertTrue(isValidKey2, "Second session key not stored correctly");

        // Create a valid Boop signed with the first key
        Boop memory boop1 = createSignedBoop(smartAccount, dest, ZERO_ADDRESS, sessionKey1, new bytes(0));

        // Create a valid Boop signed with the second key
        Boop memory boop2 = createSignedBoop(smartAccount, dest, ZERO_ADDRESS, sessionKey2, new bytes(0));

        // Call validate with both Boops
        vm.startPrank(smartAccount);
        bytes memory result1 = SessionKeyValidator(sessionKeyValidator).validate(boop1);
        bytes memory result2 = SessionKeyValidator(sessionKeyValidator).validate(boop2);
        vm.stopPrank();

        // Both should return empty bytes4(0) for success
        assertEq(result1, abi.encodeWithSelector(bytes4(0)), "First session key validation failed");
        assertEq(result2, abi.encodeWithSelector(bytes4(0)), "Second session key validation failed");

        // Remove only the first session key
        vm.prank(smartAccount);
        SessionKeyValidator(sessionKeyValidator).removeSessionKey(dest, publicKey1);

        // Verify first key was removed but second still works
        isValidKey1 = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, dest, publicKey1);
        isValidKey2 = SessionKeyValidator(sessionKeyValidator).sessionKeys(smartAccount, dest, publicKey2);
        assertFalse(isValidKey1, "First session key should be removed");
        assertTrue(isValidKey2, "Second session key should still be active");

        // Validation should now fail with first key but succeed with second
        vm.startPrank(smartAccount);
        result1 = SessionKeyValidator(sessionKeyValidator).validate(boop1);
        result2 = SessionKeyValidator(sessionKeyValidator).validate(boop2);
        vm.stopPrank();

        // First should fail, second should succeed
        assertEq(
            result1, abi.encodeWithSelector(InvalidSignature.selector), "First key should fail validation after removal"
        );
        assertEq(result2, abi.encodeWithSelector(bytes4(0)), "Second key should still pass validation");
    }

    // ====================================================================================================
    // HELPER FUNCTIONS

    /// @dev Helper function to get the toEthSignedMessageHash function from ECDSA
    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}
