// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/src/Script.sol";
import {Counter} from "../src/Counter.sol";

contract CounterScript is Script {
    Counter public counter;

    function setUp() public {}

    function run() public {

        if (_isContract(address(0xEA7a81bAcbAC93AfDc603902FE64eA3d361Ba326))){
            return;
        }

        vm.startBroadcast();

        counter = new Counter{salt: "DONTCHANGE"}(); // deploys at 0xEA7a81bAcbAC93AfDc603902FE64eA3d361Ba326 with anvil account 1 private key

        vm.stopBroadcast();
    }

    function _isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
}