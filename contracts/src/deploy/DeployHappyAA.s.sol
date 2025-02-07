// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {BaseDeployScript} from "./BaseDeployScript.sol";

import {HappyEntryPoint} from "../HappyAccounts/core/HappyEntryPoint.sol";
import {ScrappyAccount} from "../HappyAccounts/samples/ScrappyAccount.sol";
import {ScrappyPaymaster} from "../HappyAccounts/samples/ScrappyPaymaster.sol";
import {ScrappyAccountFactory} from "../HappyAccounts/factories/ScrappyAccountFactory.sol";

contract DeployHappyAAContracts is BaseDeployScript {
    bytes32 public constant DEPLOYMENT_SALT = bytes32(uint256(0));
    address public constant CREATE2_PROXY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    uint256 public constant PAYMASTER_DEPOSIT = 10 ether;

    ScrappyAccount public scrappyAccount;
    HappyEntryPoint public happyEntryPoint;
    ScrappyPaymaster public scrappyPaymaster;
    ScrappyPaymaster public scrappyPaymasterImpl;
    ScrappyAccountFactory public scrappyAccountFactory;

    function deploy() internal override {
        string memory config = vm.envOr("CONFIG", string(""));
        bool isLocal = keccak256(bytes(config)) == keccak256(bytes("LOCAL"));

        if (isLocal) {
            require(
                msg.sender == 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,
                "In local mode, please deploy with Anvil Account 0 to keep the deployment files deterministic."
            );
        }

        // The owner is anvil address 0 in local testing, and the HappyChain deployer otherwise.
        address owner = isLocal ? msg.sender : 0xEe3aE13ed56E877874a6C5FBe7cdA7fc8573a7bE;

        // -----------------------------------------------------------------------------------------

        (address payable _happyEntryPoint,) = deployDeterministic( //-
            "HappyEntryPoint",
            type(HappyEntryPoint).creationCode,
            abi.encode(),
            DEPLOYMENT_SALT //-
        );
        happyEntryPoint = HappyEntryPoint(_happyEntryPoint);

        // -----------------------------------------------------------------------------------------

        (address payable _scrappyAccount,) = deployDeterministic( //-
            "ScrappyAccount",
            type(ScrappyAccount).creationCode,
            abi.encode(_happyEntryPoint),
            DEPLOYMENT_SALT //-
        );
        scrappyAccount = ScrappyAccount(_scrappyAccount);

        // -----------------------------------------------------------------------------------------

        (address _scrappyAccountFactory,) = deployDeterministic( //-
            "ScrappyAccountFactory",
            type(ScrappyAccountFactory).creationCode,
            abi.encode(_scrappyAccount),
            DEPLOYMENT_SALT //-
        );
        scrappyAccountFactory = ScrappyAccountFactory(_scrappyAccountFactory);

        // -----------------------------------------------------------------------------------------

        (address payable _scrappyPaymasterImpl,) = deployDeterministic( //-
            "ScrappyPaymasterImpl",
            "ScrappyPaymaster",
            type(ScrappyPaymaster).creationCode,
            abi.encode(),
            DEPLOYMENT_SALT //-
        );
        scrappyPaymasterImpl = ScrappyPaymaster(_scrappyPaymasterImpl);

        // -----------------------------------------------------------------------------------------

        (address _scrappyPaymaster, bool paymasterDeployed) = deployDeterministicProxy( //-
            "ScrappyPaymaster",
            _scrappyPaymasterImpl,
            abi.encodeCall(
                scrappyPaymasterImpl.initialize,
                (_happyEntryPoint, 0xc80629fE33747288AaFb97684F86f7eD2D1aBF69, 10 ^ 9 wei, owner)
            ), // TODO, proper values?
            DEPLOYMENT_SALT //-
        );
        scrappyPaymaster = ScrappyPaymaster(payable(_scrappyPaymaster));

        if (isLocal && paymasterDeployed) {
            // In local mode, fund the paymaster with some gas tokens.
            payable(_scrappyPaymaster).transfer(PAYMASTER_DEPOSIT);
        }

        // -----------------------------------------------------------------------------------------
    }
}
