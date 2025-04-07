// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {BaseDeployScript} from "./BaseDeployScript.sol";

import {HappyEntryPoint} from "../happy-accounts/core/HappyEntryPoint.sol";
import {ScrappyAccountProxy} from "../happy-accounts/samples/ScrappyAccountProxy.sol";
import {ScrappyAccount} from "../happy-accounts/samples/ScrappyAccount.sol";
import {ScrappyAccountBeacon} from "../happy-accounts/samples/ScrappyAccountBeacon.sol";
import {ScrappyPaymaster} from "../happy-accounts/samples/ScrappyPaymaster.sol";
import {ScrappyAccountFactory} from "../happy-accounts/factories/ScrappyAccountFactory.sol";

contract DeployHappyAAContracts is BaseDeployScript {
    bytes32 public constant DEPLOYMENT_SALT = bytes32(uint256(0));
    address public constant CREATE2_PROXY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    uint256 public constant PM_SUBMITTER_TIP_PER_BYTE = 2 gwei;
    uint256 public constant PM_DEPOSIT = 10 ether;

    ScrappyAccountProxy public scrappyAccount;
    HappyEntryPoint public happyEntryPoint;
    ScrappyPaymaster public scrappyPaymaster;
    ScrappyAccountFactory public scrappyAccountFactory;
    ScrappyAccountBeacon public scrappyAccountBeacon;

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

        (address _scrappyAccountBeacon, ) = deployDeterministic( //-
            "ScrappyAccountBeacon",
            type(ScrappyAccountBeacon).creationCode,
            abi.encode(_scrappyAccount, owner),
            DEPLOYMENT_SALT //-
        ); 

        (address payable _scrappyAccountProxy,) = deployDeterministic( //-
            "ScrappyAccountProxy",
            type(ScrappyAccountProxy).creationCode,
            abi.encode(_happyEntryPoint, _scrappyAccountBeacon, ""),
            DEPLOYMENT_SALT //-
        );
        scrappyAccount = ScrappyAccountProxy(_scrappyAccountProxy);
        scrappyAccountBeacon = ScrappyAccountBeacon(_scrappyAccountBeacon);

        // -----------------------------------------------------------------------------------------

        (address _scrappyAccountFactory,) = deployDeterministic( //-
            "ScrappyAccountFactory",
            type(ScrappyAccountFactory).creationCode,
            abi.encode(scrappyAccountBeacon),
            DEPLOYMENT_SALT //-
        );
        scrappyAccountFactory = ScrappyAccountFactory(_scrappyAccountFactory);

        // -----------------------------------------------------------------------------------------

        (address payable _scrappyPaymaster,) = deployDeterministic( //-
            "ScrappyPaymaster",
            type(ScrappyPaymaster).creationCode,
            abi.encode(_happyEntryPoint, PM_SUBMITTER_TIP_PER_BYTE, owner),
            DEPLOYMENT_SALT //-
        );
        scrappyPaymaster = ScrappyPaymaster(_scrappyPaymaster);

        // -----------------------------------------------------------------------------------------

        if (isLocal) {
            // In local mode, fund the paymaster with some gas tokens.
            vm.deal(_scrappyPaymaster, PM_DEPOSIT);

            // Send dust to address(0) to avoid the 25000 extra gas cost when sending to an empty account during simulation
            // CALL opcode charges 25000 extra gas when the target has 0 balance (empty account)
            vm.deal(address(0), 1 wei);
        }

        // -----------------------------------------------------------------------------------------
    }

    /// @dev Deployment for tests. Avoids broadcasting transactions, allowing use of vm.prank().
    function deployForTests() external {
        deploy();
    }
}
