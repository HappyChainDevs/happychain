// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console} from "forge-std/console.sol";
import {BaseDeployScript} from "../BaseDeployScript.sol";
import "kernel/Kernel.sol";
import {KernelFactory} from "kernel/factory/KernelFactory.sol";
import {FactoryStaker} from "kernel/factory/FactoryStaker.sol";
import {ECDSAValidator} from "kernel/validator/ECDSAValidator.sol";

/**
 * @dev Deploys Kernel Factory and associated contracts.
 */
contract DeployKernelFactory is BaseDeployScript {
    address public constant DEPLOYER = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address public constant ENTRYPOINT_0_7_ADDR = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
    // address constant CREATE2_PROXY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    ECDSAValidator public validator;
    Kernel public kernel;
    KernelFactory public factory;
    FactoryStaker public staker;

    function deploy() internal override {
        // Step 1: Deploy ECDSA Validator
        validator = new ECDSAValidator{salt: 0}();
        console.log("Validator deployed at: ");
        console.logAddress(address(validator));
        deployed("ECDSAValidator", "ECDSAValidator", address(validator));

        // Step 2: Deploy Kernel
        kernel = new Kernel{salt: 0}(IEntryPoint(ENTRYPOINT_0_7_ADDR));
        console.log("Kernel deployed at: ");
        console.logAddress(address(kernel));
        deployed("Kernel", "Kernel", address(kernel));

        // Step 3: Deploy Kernel Factory
        factory = new KernelFactory{salt: 0}(address(kernel));
        console.log("KernelFactory deployed at: ");
        console.logAddress(address(factory));
        deployed("KernelFactory", "KernelFactory", address(factory));

        // Step 4: Deploy Factory Staker
        staker = new FactoryStaker{salt: 0}(DEPLOYER);
        console.log("FactoryStaker deployed at: ");
        console.logAddress(address(staker));
        deployed("FactoryStaker", "FactoryStaker", address(staker));

        // Step 5: Approve Kernel Factory by Factory Staker
        staker.approveFactory(factory, true);
        console.log("KernelFactory approved by Factory Staker");
    }
}