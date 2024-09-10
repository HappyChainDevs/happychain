// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.0; // solhint-disable-line

import {BaseDeployScript} from "./BaseDeployScript.sol";
import {ENTRYPOINT_V7_CODE} from "./initcode/EntryPointV7Code.sol";
import {ENTRYPOINT_SIMULATIONS_CODE} from "./initcode/EntryPoinSimulationsCode.sol";

import {SigningPaymaster} from "../SigningPaymaster.sol";

import {Kernel, IEntryPoint as KernelIEntryPoint} from "kernel/Kernel.sol";
import {IEntryPoint as AAIEntryPoint} from "account-abstraction/contracts/interfaces/IEntryPoint.sol";
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
    address public constant EXPECTED_ERC20MOCK = 0x8a14487D21003F68B7de8E0D10B396fb2AE1DD91;

    error EntryPointDeploymentFailed();
    error EntryPointSimulationsDeploymentFailed();

    IEntryPoint public entrypoint = IEntryPoint(EXPECTED_ENTRYPOINT_V7);
    IEntryPointSimulations public simulations = IEntryPointSimulations(EXPECTED_ENTRYPOINT_SIMULATIONS);
    ECDSAValidator public validator;
    Kernel public kernel;
    KernelFactory public factory;
    FactoryStaker public staker;
    SigningPaymaster public paymaster;
    AAIEntryPoint public entryPoint;

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
        deployed("ECDSAValidator", "ECDSAValidator", address(validator));

        kernel = new Kernel{salt: 0}(KernelIEntryPoint(EXPECTED_ENTRYPOINT_V7));
        deployed("Kernel", "Kernel", address(kernel));

        factory = new KernelFactory{salt: 0}(address(kernel));
        deployed("KernelFactory", "KernelFactory", address(factory));

        staker = new FactoryStaker{salt: 0}(msg.sender);
        deployed("FactoryStaker", "FactoryStaker", address(staker));

        staker.approveFactory(factory, true);

        paymaster = new SigningPaymaster{salt: 0}(AAIEntryPoint(EXPECTED_ENTRYPOINT_V7));
        deployed("SigningPaymaster", "SigningPaymaster", address(paymaster));

        depositToPaymaster(EXPECTED_ENTRYPOINT_V7, address(paymaster), 0.1 ether);

        if (EXPECTED_ERC20MOCK.code.length == 0) {
            (bool success,) = CREATE2_PROXY.call(ERC20MOCK_CODE);
            if (!success) {
                revert();
            }
        }
        deployed("ERC20Mock", "ERC20Mock", EXPECTED_ERC20MOCK);
    }

    function depositToPaymaster(address entryPointAddress, address paymasterAddress, uint256 amount) internal {
        AAIEntryPoint(entryPointAddress).depositTo{value: amount}(paymasterAddress);
    }

    receive() external payable {}
}
