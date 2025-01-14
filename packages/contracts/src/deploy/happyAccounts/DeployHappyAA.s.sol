// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20; // solhint-disable-line

import {BaseDeployScript} from "../BaseDeployScript.sol";

import {HappyEntryPoint} from "../../HappyAccounts/core/HappyEntryPoint.sol";
import {ScrappyAccountFactory} from "../../HappyAccounts/factories/ScrappyAccountFactory.sol";
import {ScrappyAccount} from "../../HappyAccounts/samples/ScrappyAccount.sol";
import {ScrappyPaymaster} from "../../HappyAccounts/samples/ScrappyPaymaster.sol";

contract DeployAAContracts is BaseDeployScript {
    bytes32 private constant DEPLOYMENT_SALT = bytes32(uint256(0));
    address private constant CREATE2_PROXY = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    uint256 private constant PAYMASTER_DEPOSIT = 10 ether;

    ScrappyAccountFactory private scrappyAccountFactory;
    ScrappyPaymaster private scrappyPaymasterImpl;
    HappyEntryPoint private happyEntryPoint;
    ScrappyAccount private scrappyAccount;

    function deploy() internal override {
        happyEntryPoint = new HappyEntryPoint{salt: DEPLOYMENT_SALT}();
        deployed("HappyEntryPoint", address(happyEntryPoint));

        scrappyAccount = new ScrappyAccount{salt: DEPLOYMENT_SALT}(address(happyEntryPoint));
        deployed("ScrappyAccount", address(scrappyAccount));

        scrappyAccountFactory =
            new ScrappyAccountFactory{salt: DEPLOYMENT_SALT}(address(scrappyAccount), address(happyEntryPoint));
        deployed("ScrappyAccountFactory", address(scrappyAccountFactory));

        scrappyPaymasterImpl = new ScrappyPaymaster{salt: DEPLOYMENT_SALT}(address(happyEntryPoint));
        deployed("ScrappyPaymasterImpl", "ScrappyPaymaster", address(scrappyPaymasterImpl));

        // Prepare initialization data
        bytes memory initData = abi.encodeCall(ScrappyPaymaster.initialize, (msg.sender));

        // Deploy and initialize the proxy
        address scrappyPaymaster = _deployProxy(address(scrappyPaymasterImpl), initData, DEPLOYMENT_SALT);
        deployed("ScrappyPaymaster", scrappyPaymaster);
    }
}
