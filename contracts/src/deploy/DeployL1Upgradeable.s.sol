// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {ERC1967Proxy} from "openzeppelin/proxy/ERC1967/ERC1967Proxy.sol";
import {BaseDeployScript} from "src/deploy/BaseDeployScript.sol";
import {HappyERC20Upgradeable} from "src/HappyERC20Upgradeable.sol";

/**
 * @dev Deploys an upgradeable version of the HappyERC20 contract.
 *  # cf. https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies
 *  # cf. https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable
 */
contract DeployL1Upgradeable is BaseDeployScript {
    HappyERC20Upgradeable public happyERC20Implem;
    HappyERC20Upgradeable public happyERC20Proxy;

    function deploy() internal override {
        happyERC20Implem = new HappyERC20Upgradeable();
        happyERC20Proxy = HappyERC20Upgradeable(
            address(
                new ERC1967Proxy(
                    address(happyERC20Implem), abi.encodeWithSelector(HappyERC20Upgradeable.initialize.selector)
                )
            )
        );
        // We don't need the ABI for the implementation, we just want the address.
        deployed("HappyERC20Implem", "", address(happyERC20Implem));
        deployed("HappyERC20", "HappyERC20Upgradeable", address(happyERC20Proxy));
    }
}
