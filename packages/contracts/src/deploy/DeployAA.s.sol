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

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {stdJson} from "forge-std/StdJson.sol";

// To ensure ABI generation.
import {EntryPoint} from "account-abstraction/contracts/core/EntryPoint.sol"; /* solhint-disable-line */
import {EntryPointSimulations} from "account-abstraction/contracts/core/EntryPointSimulations.sol"; /* solhint-disable-line */

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
    }

    // Expected addresses will be loaded from deployment.json
    DeploymentAddresses public expected;
    ERC1967Proxy public erc1967Proxy;

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
            expected.kernelFactory = address(new KernelFactory{salt: DEPLOYMENT_SALT}(expected.kernel));
        }

        deployed("KernelFactory", expected.kernelFactory);

        if (expected.factoryStaker.code.length == 0) {
            expected.factoryStaker = address(new FactoryStaker{salt: DEPLOYMENT_SALT}(msg.sender));
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
            expected.happyPaymaster =
                _deployImplementationAndProxy(expected.happyPaymasterImpl, initData, DEPLOYMENT_SALT);
        }

        deployed("HappyPaymaster", "ERC1967Proxy", expected.happyPaymaster);

        HappyPaymaster paymaster = HappyPaymaster(expected.happyPaymaster);
        paymaster.deposit{value: PAYMASTER_DEPOSIT}();

        if (expected.sessionKeyValidator.code.length == 0) {
            expected.sessionKeyValidator = address(new SessionKeyValidator{salt: DEPLOYMENT_SALT}());
        }

        deployed("SessionKeyValidator", expected.sessionKeyValidator);
    }
}
