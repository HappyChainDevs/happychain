// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.28;

import {UpgradeableBeacon} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

contract HappyAccountBeacon is UpgradeableBeacon {
    constructor(address initialImplementation, address owner) UpgradeableBeacon(initialImplementation, owner) {}
}
