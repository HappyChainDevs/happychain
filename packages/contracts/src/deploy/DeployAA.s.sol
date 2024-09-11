// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; // solhint-disable-line

import {BaseDeployScript} from "./BaseDeployScript.sol";
import {ENTRYPOINT_V7_CODE} from "./initcode/EntryPointV7Code.sol";
import {ENTRYPOINT_SIMULATIONS_CODE} from "./initcode/EntryPoinSimulationsCode.sol";

import {Kernel, IEntryPoint} from "kernel/Kernel.sol";
import {KernelFactory} from "kernel/factory/KernelFactory.sol";
import {FactoryStaker} from "kernel/factory/FactoryStaker.sol";
import {ECDSAValidator} from "kernel/validator/ECDSAValidator.sol";

// To ensure ABI generation.
import {IEntryPoint} from "kernel/interfaces/IEntryPoint.sol";
import {IEntryPointSimulations} from "kernel/interfaces/IEntryPointSimulations.sol";

contract DeployAAContracts is BaseDeployScript {
    address public constant CREATE2_PROXY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    address public constant EXPECTED_ENTRYPOINT_V7 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
    address public constant EXPECTED_ENTRYPOINT_SIMULATIONS = 0x74Cb5e4eE81b86e70f9045036a1C5477de69eE87;

    error EntryPointDeploymentFailed();
    error EntryPointSimulationsDeploymentFailed();

    IEntryPoint public entrypoint = IEntryPoint(EXPECTED_ENTRYPOINT_V7);
    IEntryPointSimulations public simulations = IEntryPointSimulations(EXPECTED_ENTRYPOINT_SIMULATIONS);
    ECDSAValidator public validator;
    Kernel public kernel;
    KernelFactory public factory;
    FactoryStaker public staker;

    function deploy() internal override {
        if (EXPECTED_ENTRYPOINT_V7.code.length == 0) {
            // solhint-disable-next-line
            (bool success,) = CREATE2_PROXY.call(ENTRYPOINT_V7_CODE);
            if (!success) {
                revert EntryPointDeploymentFailed();
            }
        }
        deployed("EntryPointSimulations", "IEntryPointSimulations", EXPECTED_ENTRYPOINT_SIMULATIONS);

        if (EXPECTED_ENTRYPOINT_SIMULATIONS.code.length == 0) {
            // solhint-disable-next-line
            (bool success,) = CREATE2_PROXY.call(ENTRYPOINT_SIMULATIONS_CODE);
            if (!success) {
                revert EntryPointSimulationsDeploymentFailed();
            }
        }
        deployed("EntryPointV7", "IEntryPoint", EXPECTED_ENTRYPOINT_V7);

        validator = new ECDSAValidator{salt: 0}();
        deployed("ECDSAValidator", address(validator));

        kernel = new Kernel{salt: 0}(IEntryPoint(EXPECTED_ENTRYPOINT_V7));
        deployed("Kernel", address(kernel));

        factory = new KernelFactory{salt: 0}(address(kernel));
        deployed("KernelFactory", address(factory));

        staker = new FactoryStaker{salt: 0}(msg.sender);
        deployed("FactoryStaker", address(staker));

        staker.approveFactory(factory, true);
    }
}
