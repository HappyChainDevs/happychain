// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {EntryPoint} from "boop/core/EntryPoint.sol";
import {HappyAccount} from "boop/happychain/HappyAccount.sol";
import {HappyAccountBeaconProxy} from "boop/happychain/HappyAccountBeaconProxy.sol";
import {HappyAccountBeacon} from "boop/happychain/HappyAccountBeacon.sol";
import {HappyPaymaster} from "boop/happychain/HappyPaymaster.sol";
import {HappyAccountBeaconProxyFactory} from "boop/happychain/factories/HappyAccountBeaconProxyFactory.sol";
import {HappyAccountUUPSProxyFactory} from "boop/happychain/factories/HappyAccountUUPSProxyFactory.sol";
import {HappyAccountUUPSProxy} from "boop/happychain/HappyAccountUUPSProxy.sol";
import {console} from "forge-std/console.sol";

contract DeployBoopContracts is BaseDeployScript {
    bytes32 public constant DEPLOYMENT_SALT = bytes32(uint256(0));
    address public constant CREATE2_PROXY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    uint256 public constant PM_SUBMITTER_TIP_PER_BYTE = 2 gwei;
    uint256 public constant PM_DEPOSIT = 10 ether;

    EntryPoint public entryPoint;
    HappyAccount public happyAccountImpl;
    address public happyAccount;
    HappyAccountBeacon public happyAccountBeacon;

    HappyPaymaster public happyPaymaster;

    HappyAccountBeaconProxyFactory public happyAccountBeaconProxyFactory;
    HappyAccountUUPSProxyFactory public happyAccountUUPSProxyFactory;

    function deploy() internal override {
        string memory config = vm.envOr("CONFIG", string(""));
        bool isLocal = keccak256(bytes(config)) == keccak256(bytes("LOCAL"));

        string memory proxyType = vm.envOr("PROXY_TYPE", string(""));
        bool isUUPS = keccak256(bytes(proxyType)) == keccak256(bytes("UUPS"));
        console.log("Proxy type: %s", proxyType);
        if (isLocal) {
            require(
                msg.sender == 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,
                "In local mode, please deploy with Anvil Account 0 to keep the deployment files deterministic."
            );
        }

        // The owner is anvil address 0 in local testing, and the HappyChain deployer otherwise.
        address owner = isLocal ? msg.sender : 0xEe3aE13ed56E877874a6C5FBe7cdA7fc8573a7bE;

        // -----------------------------------------------------------------------------------------

        (address payable _entryPoint,) = deployDeterministic( //-
            "EntryPoint",
            type(EntryPoint).creationCode,
            abi.encode(),
            DEPLOYMENT_SALT //-
        );
        entryPoint = EntryPoint(_entryPoint);

        // -----------------------------------------------------------------------------------------

        (address payable _happyAccountImpl,) = deployDeterministic( //-
            "HappyAccountImpl",
            type(HappyAccount).creationCode,
            abi.encode(_entryPoint),
            DEPLOYMENT_SALT //-
        );
        happyAccountImpl = HappyAccount(_happyAccountImpl);

        // -----------------------------------------------------------------------------------------
        if (isUUPS) {
            (address payable _happyAccountProxy,) = deployDeterministic( //-
                "HappyAccountUUPSProxy",
                type(HappyAccountUUPSProxy).creationCode,
                abi.encode(entryPoint),
                DEPLOYMENT_SALT //-
            );
            happyAccount = _happyAccountProxy;

            (address _happyAccountProxyFactory,) = deployDeterministic( //-
                "HappyAccountUUPSProxyFactory",
                type(HappyAccountUUPSProxyFactory).creationCode,
                abi.encode(_happyAccountProxy),
                DEPLOYMENT_SALT //-
            );
            happyAccountUUPSProxyFactory = HappyAccountUUPSProxyFactory(_happyAccountProxyFactory);
        } else {
            // default to beacon proxies
            (address payable _happyAccountBeacon,) = deployDeterministic( //-
                "HappyAccountBeaconProxy",
                type(HappyAccountBeacon).creationCode,
                abi.encode(happyAccountImpl, owner),
                DEPLOYMENT_SALT //-
            );
            happyAccountBeacon = HappyAccountBeacon(_happyAccountBeacon);

            (address _happyAccountBeaconFactory,) = deployDeterministic( //-
                "HappyAccountBeaconProxyFactory",
                type(HappyAccountBeaconProxyFactory).creationCode,
                abi.encode(happyAccountBeacon),
                DEPLOYMENT_SALT //-
            );
            happyAccountBeaconProxyFactory = HappyAccountBeaconProxyFactory(_happyAccountBeaconFactory);

            (address payable _happyAccountBeaconProxy,) = deployDeterministic( //-
                "HappyAccountBeaconProxy",
                type(HappyAccountBeaconProxy).creationCode,
                abi.encode(entryPoint, happyAccountBeacon, ""),
                DEPLOYMENT_SALT //-
            );
            happyAccount = _happyAccountBeaconProxy;
        }

        // -----------------------------------------------------------------------------------------

        (address payable _happyPaymaster,) = deployDeterministic( //-
            "HappyPaymaster",
            type(HappyPaymaster).creationCode,
            abi.encode(_entryPoint, PM_SUBMITTER_TIP_PER_BYTE, owner),
            DEPLOYMENT_SALT //-
        );
        happyPaymaster = HappyPaymaster(_happyPaymaster);

        // -----------------------------------------------------------------------------------------

        if (isLocal) {
            // In local mode, fund the paymaster with some gas tokens.
            vm.deal(_happyPaymaster, PM_DEPOSIT);

            // Send dust to address(0) to avoid the 25000 extra gas cost when sending to an empty account during simulation
            // CALL opcode charges 25000 extra gas when the target has 0 balance (empty account)
            vm.deal(address(0), 1 wei);
        }

        // -----------------------------------------------------------------------------------------
    }

    /// @dev Deployment for tests. Avoids broadcasting transactions, allowing use of vm.prank().
    function deployForTests() external {
        deploy();
    }
}
