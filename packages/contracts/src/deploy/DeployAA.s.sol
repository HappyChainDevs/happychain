// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.0; // solhint-disable-line

import {BaseDeployScript} from "./BaseDeployScript.sol";
import {ENTRYPOINT_V7_CODE} from "./initcode/EntryPointV7Code.sol";
import {ENTRYPOINT_SIMULATIONS_CODE} from "./initcode/EntryPointSimulationsCode.sol";

import {HappyPaymaster} from "../HappyPaymaster.sol";
import {SessionKeyValidator} from "../SessionKeyValidator.sol";

import {Kernel} from "kernel/Kernel.sol";
import {KernelFactory} from "kernel/factory/KernelFactory.sol";
import {FactoryStaker} from "kernel/factory/FactoryStaker.sol";
import {ECDSAValidator} from "kernel/validator/ECDSAValidator.sol";
import {IEntryPoint} from "kernel/interfaces/IEntryPoint.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {console} from "forge-std/Test.sol";

// To ensure ABI generation.
/* solhint-disable no-unused-import */
import {EntryPoint} from "account-abstraction/contracts/core/EntryPoint.sol";
import {EntryPointSimulations} from "account-abstraction/contracts/core/EntryPointSimulations.sol";

contract DeployAAContracts is BaseDeployScript {
    using stdJson for string;

    bytes32 public constant DEPLOYMENT_SALT = bytes32(uint256(3));
    address public constant CREATE2_PROXY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    uint256 public constant PAYMASTER_DEPOSIT = 10 ether;

    struct DeploymentAddresses {
        address ecdsaValidator;
        address entryPointSimulations;
        address entryPointV7;
        address factoryStaker;
        address happyPaymaster;
        address happyPaymasterImpl;
        address kernel;
        address kernelFactory;
        address sessionKeyValidator;
        address sessionKeyValidatorImpl;
    }

    // Expected addresses will be loaded from deployment.json
    DeploymentAddresses private expected;
    KernelFactory private factory;
    FactoryStaker private staker;
    HappyPaymaster private paymaster;

    error EntryPointDeploymentFailed();
    error EntryPointSimulationsDeploymentFailed();
    error ConfigNotSet();
    error InvalidConfig(string config);
    error DeploymentJsonReadError();

    function _loadExpectedAddresses() internal {
        string memory config = vm.envOr("CONFIG", string(""));
        if (bytes(config).length == 0) revert ConfigNotSet();

        string memory deploymentPath;
        if (keccak256(bytes(config)) == keccak256(bytes("LOCAL"))) {
            deploymentPath = "deployments/anvil/testing/deployment.json";
        } else if (keccak256(bytes(config)) == keccak256(bytes("TEST"))) {
            deploymentPath = "deployments/happy-sepolia/aa/deployment.json";
        } else {
            revert InvalidConfig(config);
        }

        string memory json = vm.readFile(deploymentPath);
        bytes memory data = vm.parseJson(json);
        console.log(string(data));
        expected = abi.decode(data, (DeploymentAddresses));
    }

    function deploy() internal override {
        _loadExpectedAddresses();

        if (expected.entryPointSimulations.code.length == 0) {
            // solhint-disable-next-line
            (bool success,) = CREATE2_PROXY.call(ENTRYPOINT_SIMULATIONS_CODE);
            if (!success) {
                revert EntryPointSimulationsDeploymentFailed();
            }
        }

        deployed("EntryPointSimulations", expected.entryPointSimulations);

        if (expected.entryPointV7.code.length == 0) {
            // solhint-disable-next-line
            (bool success,) = CREATE2_PROXY.call(ENTRYPOINT_V7_CODE);
            if (!success) {
                revert EntryPointDeploymentFailed();
            }
        }

        deployed("EntryPointV7", "EntryPoint", expected.entryPointV7);

        if (expected.ecdsaValidator.code.length == 0) {
            expected.ecdsaValidator = address(new ECDSAValidator{salt: DEPLOYMENT_SALT}());
        }

        deployed("ECDSAValidator", expected.ecdsaValidator);

        if (expected.kernel.code.length == 0) {
            expected.kernel = address(new Kernel{salt: DEPLOYMENT_SALT}(IEntryPoint(expected.entryPointV7)));
        }

        deployed("Kernel", expected.kernel);

        if (expected.kernelFactory.code.length == 0) {
            factory = new KernelFactory{salt: DEPLOYMENT_SALT}(expected.kernel);
            expected.kernelFactory = address(factory);
        }

        deployed("KernelFactory", expected.kernelFactory);

        if (expected.factoryStaker.code.length == 0) {
            staker = new FactoryStaker{salt: DEPLOYMENT_SALT}(msg.sender);
            expected.factoryStaker = address(staker);
            staker.approveFactory(factory, true);
        }

        deployed("FactoryStaker", expected.factoryStaker);

        if (expected.happyPaymasterImpl.code.length == 0) {
            expected.happyPaymasterImpl = address(new HappyPaymaster{salt: DEPLOYMENT_SALT}());
        }

        deployed("HappyPaymasterImpl", "HappyPaymaster", expected.happyPaymasterImpl);

        if (expected.happyPaymaster.code.length == 0) {
            // Prepare initialization data
            bytes memory initData = abi.encodeCall(HappyPaymaster.initialize, (expected.entryPointV7, msg.sender));

            // Deploy and initialize the proxy
            expected.happyPaymaster = _deployProxy(expected.happyPaymasterImpl, initData, DEPLOYMENT_SALT);
        }

        deployed("HappyPaymaster", expected.happyPaymaster);

        paymaster = HappyPaymaster(expected.happyPaymaster);
        paymaster.deposit{value: PAYMASTER_DEPOSIT}();

        if (expected.sessionKeyValidatorImpl.code.length == 0) {
            expected.sessionKeyValidatorImpl = address(new SessionKeyValidator{salt: DEPLOYMENT_SALT}());
        }

        deployed("SessionKeyValidatorImpl", "SessionKeyValidator", expected.sessionKeyValidatorImpl);

        if (expected.sessionKeyValidator.code.length == 0) {
            // Prepare initialization data
            bytes memory initData = abi.encodeCall(SessionKeyValidator.initialize, (msg.sender));
            // Deploy and initialize the proxy
            expected.sessionKeyValidator = _deployProxy(expected.sessionKeyValidatorImpl, initData, DEPLOYMENT_SALT);
        }

        deployed("SessionKeyValidator", expected.sessionKeyValidator);
    }
}
