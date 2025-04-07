// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.28;

import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

contract ScrappyAccountProxy is BeaconProxy {
    constructor(address entrypoint, address beacon, bytes memory data) BeaconProxy(beacon, data){}

    // fallback
    receive() external payable {}
}