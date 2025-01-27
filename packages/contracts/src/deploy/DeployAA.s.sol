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

// To ensure ABI generation.
/* solhint-disable no-unused-import */
import {EntryPoint} from "account-abstraction/contracts/core/EntryPoint.sol";
import {EntryPointSimulations} from "account-abstraction/contracts/core/EntryPointSimulations.sol";

contract DeployAAContracts is BaseDeployScript {
    using stdJson for string;

    bytes32 public constant DEPLOYMENT_SALT = bytes32(uint256(4));
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

        // TODO Use a library to predict the deployment address, and skip only if it is the same
        //      as the expected address and has code.

        string memory deploymentPath;
        if (keccak256(bytes(config)) == keccak256(bytes("LOCAL"))) {
            deploymentPath = "deployments/anvil/aa/deployment.json";
        } else if (keccak256(bytes(config)) == keccak256(bytes("TEST"))) {
            deploymentPath = "deployments/happy-sepolia/aa/deployment.json";
        } else {
            revert InvalidConfig(config);
        }

        string memory json = vm.readFile(deploymentPath);
        bytes memory data = vm.parseJson(json);
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

        (expected.ecdsaValidator,) =
            deployDeterministic("ECDSAValidator", type(ECDSAValidator).creationCode, abi.encode(), DEPLOYMENT_SALT);

        (expected.kernel,) = deployDeterministic(
            "Kernel", type(Kernel).creationCode, abi.encode(expected.entryPointV7), DEPLOYMENT_SALT
        );

        bool factoryDeployed;
        (expected.kernelFactory, factoryDeployed) = deployDeterministic(
            "KernelFactory", type(KernelFactory).creationCode, abi.encode(expected.kernel), DEPLOYMENT_SALT
        );

        bool stakerDeployed;
        (expected.factoryStaker, stakerDeployed) = deployDeterministic(
            "FactoryStaker", type(FactoryStaker).creationCode, abi.encode(msg.sender), DEPLOYMENT_SALT
        );
        if (stakerDeployed || factoryDeployed) {
            FactoryStaker(expected.factoryStaker).approveFactory(KernelFactory(expected.kernelFactory), true);
        }




        (expected.happyPaymasterImpl,) = deployDeterministic(
            "HappyPaymasterImpl", "HappyPaymaster", type(HappyPaymaster).creationCode, abi.encode(), DEPLOYMENT_SALT
        );

        if (expected.happyPaymaster.code.length == 0) {
            // Prepare initialization data
            bytes memory initData = abi.encodeCall(HappyPaymaster.initialize, (expected.entryPointV7, msg.sender));

            // Deploy and initialize the proxy
            expected.happyPaymaster = _deployProxy(expected.happyPaymasterImpl, initData, DEPLOYMENT_SALT);
        }

        deployed("HappyPaymaster", expected.happyPaymaster);

        paymaster = HappyPaymaster(expected.happyPaymaster);
        paymaster.deposit{value: PAYMASTER_DEPOSIT}();


        (expected.sessionKeyValidatorImpl,) = deployDeterministic(
            "SessionKeyValidatorImpl", type(SessionKeyValidator).creationCode, abi.encode(), DEPLOYMENT_SALT
        );

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
