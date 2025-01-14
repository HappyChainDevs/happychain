// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20; // solhint-disable-line

import {BaseDeployScript} from "../BaseDeployScript.sol";

import {EntryPoint} from "../../HappyAccounts/core/EntryPoint.sol";
import {ScrappyAccountFactory} from "../../HappyAccounts/factories/ScrappyAccountFactory.sol";
import {ScrappyAccount} from "../../HappyAccounts/samples/ScrappyAccount.sol";
import {ScrappyPaymaster} from "../../HappyAccounts/samples/ScrappyPaymaster.sol";

contract DeployAAContracts is BaseDeployScript {
    bytes32 private constant DEPLOYMENT_SALT = bytes32(uint256(0));
    address private constant CREATE2_PROXY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    uint256 private constant PAYMASTER_DEPOSIT = 10 ether;

    ScrappyAccountFactory private scrappyAccountFactory;
    ScrappyPaymaster private scrappyPaymaster;
    ScrappyAccount private scrappyAccount;
    EntryPoint private entryPoint;

    function deploy() internal override {
        entryPoint = new EntryPoint{salt: DEPLOYMENT_SALT}();
        deployed("HappyEntryPoint", "EntryPoint", address(entryPoint));

        scrappyAccountFactory = new ScrappyAccountFactory{salt: DEPLOYMENT_SALT}();
        deployed("ScrappyAccountFactory", "ScrappyAccountFactory", address(scrappyAccountFactory));

        scrappyPaymaster = new ScrappyPaymaster{salt: DEPLOYMENT_SALT}();
        deployed("ScrappyPaymaster", "ScrappyPaymaster", address(scrappyPaymaster));

        // Prepare initialization data
        bytes memory initData = abi.encodeCall(HappyPaymaster.initialize, (expected.entryPointV7, msg.sender));

        // Deploy and initialize the proxy
        expected.happyPaymaster = _deployProxy(expected.happyPaymasterImpl, initData, DEPLOYMENT_SALT);

        scrappyAccount = new ScrappyAccount{salt: DEPLOYMENT_SALT}();
        deployed("ScrappyAccount", "ScrappyAccount", address(scrappyAccount));
    }
}
