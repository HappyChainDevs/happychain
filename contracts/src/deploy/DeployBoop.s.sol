// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {EntryPoint} from "boop/core/EntryPoint.sol";
import {BatchCallExecutor} from "boop/extensions/BatchCallExecutor.sol";
import {BatchCallExecutor} from "boop/extensions/BatchCallExecutor.sol";
import {SessionKeyValidator} from "boop/extensions/SessionKeyValidator.sol";
import {HappyAccountBeaconProxyFactory} from "boop/happychain/factories/HappyAccountBeaconProxyFactory.sol";
import {HappyAccountUUPSProxyFactory} from "boop/happychain/factories/HappyAccountUUPSProxyFactory.sol";
import {HappyAccount} from "boop/happychain/HappyAccount.sol";
import {HappyAccountBeacon} from "boop/happychain/HappyAccountBeacon.sol";
import {HappyAccountRegistry} from "boop/happychain/HappyAccountRegistry.sol";
import {HappyAccountUUPSProxy} from "boop/happychain/HappyAccountUUPSProxy.sol";
import {HappyPaymaster} from "boop/happychain/HappyPaymaster.sol";
import {BaseDeployScript} from "src/deploy/BaseDeployScript.sol";

contract DeployBoopContracts is BaseDeployScript {
    bytes32 public constant DEPLOYMENT_SALT = bytes32(uint256(0));
    address public constant CREATE2_PROXY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    uint256 public constant PM_SUBMITTER_TIP_PER_BYTE = 2 gwei;
    uint256 public constant PM_DEPOSIT = 10 ether;

    EntryPoint public entryPoint;
    HappyAccount public happyAccountImpl;
    HappyPaymaster public happyPaymaster;
    HappyAccountRegistry public happyAccountRegistry;
    HappyAccountBeacon public happyAccountBeacon;
    HappyAccountBeaconProxyFactory public happyAccountBeaconProxyFactory;
    HappyAccountUUPSProxyFactory public happyAccountUUPSProxyFactory;
    SessionKeyValidator public sessionKeyValidator;
    BatchCallExecutor public batchCallExecutor;

    bool private isLocal; // flag to indicate if the deployment is local, performs additional setup
    bool private isUUPS; // flag to determine which proxy type to use
    address public owner; // owner/deployer of deployed contracts

    function run() public override {
        string memory config = vm.envOr("CONFIG", string(""));
        isLocal = keccak256(bytes(config)) == keccak256(bytes("LOCAL"));

        string memory proxyType = vm.envOr("PROXY_TYPE", string(""));
        isUUPS = keccak256(bytes(proxyType)) == keccak256(bytes("UUPS"));

        // The owner is anvil address 0 in local testing and anvil deployments, and the HappyChain deployer otherwise.
        owner = isLocal ? 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 : 0xEe3aE13ed56E877874a6C5FBe7cdA7fc8573a7bE;

        vm.startBroadcast();
        deploy();
        vm.stopBroadcast();
        writeDeploymentJson();
    }

    function deploy() internal override {
        // -----------------------------------------------------------------------------------------

        (address payable _entryPoint,) = deployDeterministic( //-
            "EntryPoint",
            type(EntryPoint).creationCode,
            abi.encode(),
            DEPLOYMENT_SALT //-
        );
        entryPoint = EntryPoint(_entryPoint);

        // -----------------------------------------------------------------------------------------

        (address payable _registry,) = deployDeterministic( //-
            "HappyAccountRegistry",
            type(HappyAccountRegistry).creationCode,
            abi.encode(),
            DEPLOYMENT_SALT //-
        );
        happyAccountRegistry = HappyAccountRegistry(_registry);

        // -----------------------------------------------------------------------------------------

        (address payable _happyAccountImpl,) = deployDeterministic( //-
            "HappyAccountImpl",
            "HappyAccount",
            type(HappyAccount).creationCode,
            abi.encode(_entryPoint),
            DEPLOYMENT_SALT //-
        );
        happyAccountImpl = HappyAccount(_happyAccountImpl);

        // -----------------------------------------------------------------------------------------
        if (isUUPS) {
            (address payable _happyAccountUUPSImpl,) = deployDeterministic( //-
                "HappyAccountUUPSImpl",
                type(HappyAccountUUPSProxy).creationCode,
                abi.encode(entryPoint),
                DEPLOYMENT_SALT //-
            );

            (address _happyAccountProxyFactory,) = deployDeterministic( //-
                "HappyAccountUUPSProxyFactory",
                type(HappyAccountUUPSProxyFactory).creationCode,
                abi.encode(_happyAccountUUPSImpl, happyAccountRegistry),
                DEPLOYMENT_SALT //-
            );
            happyAccountUUPSProxyFactory = HappyAccountUUPSProxyFactory(_happyAccountProxyFactory);
            happyAccountRegistry.setAuthorizedFactory(address(happyAccountUUPSProxyFactory), true);
            happyAccountRegistry.transferOwnership(owner);
        } else {
            // default to beacon proxies
            (address payable _happyAccountBeacon,) = deployDeterministic( //-
                "HappyAccountBeacon",
                type(HappyAccountBeacon).creationCode,
                abi.encode(happyAccountImpl, owner),
                DEPLOYMENT_SALT //-
            );
            happyAccountBeacon = HappyAccountBeacon(_happyAccountBeacon);

            (address _happyAccountBeaconFactory,) = deployDeterministic( //-
                "HappyAccountBeaconProxyFactory",
                type(HappyAccountBeaconProxyFactory).creationCode,
                abi.encode(happyAccountBeacon, happyAccountRegistry),
                DEPLOYMENT_SALT //-
            );
            happyAccountBeaconProxyFactory = HappyAccountBeaconProxyFactory(_happyAccountBeaconFactory);
            happyAccountRegistry.setAuthorizedFactory(address(happyAccountBeaconProxyFactory), true);
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

        (address payable _sessionKeyValidator,) = deployDeterministic( //-
            "SessionKeyValidator",
            type(SessionKeyValidator).creationCode,
            "",
            DEPLOYMENT_SALT //-
        );
        sessionKeyValidator = SessionKeyValidator(_sessionKeyValidator);

        // -----------------------------------------------------------------------------------------

        (address payable _batchCallExecutor,) = deployDeterministic( //-
            "BatchCallExecutor",
            type(BatchCallExecutor).creationCode,
            "",
            DEPLOYMENT_SALT //-
        );
        batchCallExecutor = BatchCallExecutor(_batchCallExecutor);

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

    /// @dev Deployment for tests
    function deployForTests() external {
        run();
    }
}
