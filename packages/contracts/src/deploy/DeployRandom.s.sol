// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {BaseDeployScript} from "./BaseDeployScript.sol";
import {Random} from "../Randomness/Random.sol";

/**
 * @dev Deploys the Randomness contract.
 */
contract DeployL1 is BaseDeployScript {
    Random public random;

    uint256[4] public DRAND_PUBLIC_KEY;
    uint256 public constant DRAND_GENESIS_TIMESTAMP = 1727521075;
    uint256 public constant DRAND_PERIOD = 3;

    constructor() {
        DRAND_PUBLIC_KEY = [
            2416910118189096557713698606232949750075245832257361418817199221841198809231,
            3565178688866727608783247307855519961161197286613423629330948765523825963906,
            18766085122067595057703228467555884757373773082319035490740181099798629248523,
            263980444642394177375858669180402387903005329333277938776544051059273779190
        ];
    }

    function deploy() internal override {
        random = new Random(DRAND_PUBLIC_KEY, DRAND_GENESIS_TIMESTAMP, DRAND_PERIOD);
        deployed("Random", address(random));
    }
}
