// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {BaseDeployScript} from "./BaseDeployScript.sol";
import {Random} from "../randomness/Random.sol";

/**
 * @dev Deploys the Randomness contract.
 */
contract DeployRandom is BaseDeployScript {
    Random public random;

    /*
     * To understand these values. Please refer to the following link:
     * https://docs.anyrand.com/diy/quickstart
     */
    // Drand evmnet public key
    uint256[4] public drandPublicKey;
    // Drand evmnet genesis time (2024-01-29 00:11:15 UTC)
    uint256 public constant DRAND_GENESIS_TIMESTAMP = 1727521075;
    // Drand evmnet period (3 seconds)
    uint256 public constant DRAND_PERIOD = 3;

    constructor() {
        drandPublicKey = [
            2416910118189096557713698606232949750075245832257361418817199221841198809231,
            3565178688866727608783247307855519961161197286613423629330948765523825963906,
            18766085122067595057703228467555884757373773082319035490740181099798629248523,
            263980444642394177375858669180402387903005329333277938776544051059273779190
        ];
    }

    function deploy() internal override {
        (address _random,) = deployDeterministic("Random", type(Random).creationCode, abi.encode(drandPublicKey, DRAND_GENESIS_TIMESTAMP, DRAND_PERIOD), DEPLOYMENT_SALT);
        random = Random(_random);
        deployed("Random", address(random));
    }
}
