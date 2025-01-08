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

// To ensure ABI generation.
import {EntryPoint} from "account-abstraction/contracts/core/EntryPoint.sol"; /* solhint-disable-line */
import {EntryPointSimulations} from "account-abstraction/contracts/core/EntryPointSimulations.sol"; /* solhint-disable-line */

contract DeployAAContracts is BaseDeployScript {
    bytes32 public constant DEPLOYMENT_SALT = bytes32(uint256(3));
    address public constant CREATE2_PROXY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    address public constant EXPECTED_ENTRYPOINT_V7 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
    address public constant EXPECTED_ENTRYPOINT_SIMULATIONS = 0xBbe8A301FbDb2a4CD58c4A37c262ecef8f889c47;

    error EntryPointDeploymentFailed();
    error EntryPointSimulationsDeploymentFailed();

    HappyPaymaster public paymaster;
    

    function deploy() internal override {
        
        //0x14dC79964da2C08b23698B3D3cc7Ca32193d9955,0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f
        address[] memory allowedBundlers = new address[](2);
        allowedBundlers[0] = 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955;
        allowedBundlers[1] = 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f;
        
        paymaster = new HappyPaymaster(EXPECTED_ENTRYPOINT_V7, allowedBundlers);
        deployed("HappyPaymaster", address(paymaster));
    }
}
