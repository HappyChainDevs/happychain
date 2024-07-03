// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {Deploy} from "../deploy/Deploy.s.sol";

import {Main} from "../Main.sol";

contract Integration is Test {
    Deploy private deployment;
    Main private main;

    // =============================================================================================

    function setUp() public {
        deployment = new Deploy();
        deployment.dontLog();
        deployment.run();

        main = deployment.main();

        string memory mnemonic = "test test test test test test test test test test test junk";
        (address account0,) = deriveRememberKey(mnemonic, 0);

        vm.prank(account0);
        // do something as account0 (one transaction only, or use start/stopPrank)
    }

    // =============================================================================================

    function testThing() public pure {
        assertEq(uint256(1), uint256(1));
    }

    // =============================================================================================
}
