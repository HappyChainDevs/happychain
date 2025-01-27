// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.0; // solhint-disable-line

import {BaseDeployScript} from "./BaseDeployScript.sol";
import {ENTRYPOINT_V7_CODE, ENTRYPOINT_V7_SALT} from "./initcode/EntryPointV7Code.sol";
import {ENTRYPOINT_SIMULATIONS_CODE, ENTRYPOINT_SIMULATIONS_SALT} from "./initcode/EntryPointSimulationsCode.sol";

import {HappyPaymaster} from "../HappyPaymaster.sol";
import {SessionKeyValidator} from "../SessionKeyValidator.sol";

import {Kernel} from "kernel/Kernel.sol";
import {KernelFactory} from "kernel/factory/KernelFactory.sol";
import {FactoryStaker} from "kernel/factory/FactoryStaker.sol";
import {ECDSAValidator} from "kernel/validator/ECDSAValidator.sol";

// To ensure ABI generation.
/* solhint-disable no-unused-import */
import {EntryPoint} from "account-abstraction/contracts/core/EntryPoint.sol";
import {EntryPointSimulations} from "account-abstraction/contracts/core/EntryPointSimulations.sol";

contract DeployAAContracts is BaseDeployScript {
    bytes32 public constant DEPLOYMENT_SALT = bytes32(uint256(4));
    address public constant CREATE2_PROXY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    uint256 public constant PAYMASTER_DEPOSIT = 10 ether;

    EntryPointSimulations public entryPointSimulations;
    EntryPoint public entryPointV7;
    ECDSAValidator public ecdsaValidator;
    Kernel public kernel;
    KernelFactory public kernelFactory;
    FactoryStaker public factoryStaker;
    HappyPaymaster public happyPaymasterImpl;
    HappyPaymaster public happyPaymaster;
    SessionKeyValidator public sessionKeyValidatorImpl;
    SessionKeyValidator public sessionKeyValidator;

    function deploy() internal override {
        // -----------------------------------------------------------------------------------------

        (address payable _entryPointSimulations,) = deployDeterministic( //-
            "EntryPointSimulations",
            ENTRYPOINT_SIMULATIONS_CODE,
            abi.encode(),
            ENTRYPOINT_SIMULATIONS_SALT //-
        );
        entryPointSimulations = EntryPointSimulations(_entryPointSimulations);

        // -----------------------------------------------------------------------------------------

        (address payable _entryPointV7,) = deployDeterministic( //-
            "EntryPointV7",
            "EntryPoint",
            ENTRYPOINT_V7_CODE,
            abi.encode(),
            ENTRYPOINT_V7_SALT //-
        );
        entryPointV7 = EntryPoint(_entryPointV7);

        // -----------------------------------------------------------------------------------------

        (address _ecdsaValidator,) = deployDeterministic( //-
            "ECDSAValidator",
            type(ECDSAValidator).creationCode,
            bytes(""),
            DEPLOYMENT_SALT //-
        );
        ecdsaValidator = ECDSAValidator(_ecdsaValidator);

        // -----------------------------------------------------------------------------------------

        (address payable _kernel,) = deployDeterministic( //-
            "Kernel",
            type(Kernel).creationCode,
            abi.encode(_entryPointV7),
            DEPLOYMENT_SALT //-
        );
        kernel = Kernel(_kernel);

        // -----------------------------------------------------------------------------------------

        (address _kernelFactory, bool factoryDeployed) = deployDeterministic( //-
            "KernelFactory",
            type(KernelFactory).creationCode,
            abi.encode(_kernel),
            DEPLOYMENT_SALT //-
        );
        kernelFactory = KernelFactory(_kernelFactory);

        // -----------------------------------------------------------------------------------------

        (address _factoryStaker, bool stakerDeployed) = deployDeterministic( //-
            "FactoryStaker",
            type(FactoryStaker).creationCode,
            abi.encode(msg.sender),
            DEPLOYMENT_SALT //-
        );
        factoryStaker = FactoryStaker(_factoryStaker);

        if (factoryDeployed || stakerDeployed) {
            factoryStaker.approveFactory(kernelFactory, true);
        }

        // -----------------------------------------------------------------------------------------

        (address _happyPaymasterImpl,) = deployDeterministic( //-
            "HappyPaymasterImpl",
            "HappyPaymaster",
            type(HappyPaymaster).creationCode,
            bytes(""),
            DEPLOYMENT_SALT //-
        );
        happyPaymasterImpl = HappyPaymaster(_happyPaymasterImpl);

        // -----------------------------------------------------------------------------------------

        (address _happyPaymaster, bool paymasterDeployed) = deployDeterministicProxy( //-
            "HappyPaymaster",
            _happyPaymasterImpl,
            abi.encodeCall(happyPaymasterImpl.initialize, (_entryPointV7, msg.sender)),
            DEPLOYMENT_SALT //-
        );
        happyPaymaster = HappyPaymaster(_happyPaymaster);

        string memory config = vm.envOr("CONFIG", string(""));
        if (keccak256(bytes(config)) == keccak256(bytes("LOCAL")) && paymasterDeployed) {
            // In local mode, fund the paymaster with some gas tokens.
            happyPaymaster.deposit{value: PAYMASTER_DEPOSIT}();
        }

        // -----------------------------------------------------------------------------------------

        (address _sessionKeyValidatorImpl,) = deployDeterministic( //-
            "SessionKeyValidatorImpl",
            "SessionKeyValidator",
            type(SessionKeyValidator).creationCode,
            bytes(""),
            DEPLOYMENT_SALT //-
        );
        sessionKeyValidatorImpl = SessionKeyValidator(_sessionKeyValidatorImpl);

        // -----------------------------------------------------------------------------------------

        (address _sessionKeyValidator,) = deployDeterministicProxy( //-
            "SessionKeyValidator",
            _sessionKeyValidatorImpl,
            abi.encodeCall(sessionKeyValidatorImpl.initialize, (msg.sender)),
            DEPLOYMENT_SALT //-
        );
        sessionKeyValidator = SessionKeyValidator(_sessionKeyValidator);

        // -----------------------------------------------------------------------------------------
    }
}
