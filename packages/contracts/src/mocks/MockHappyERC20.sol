// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {MockERC20} from "forge-std/mocks/MockERC20.sol";

import {ERC20Permit} from "openzeppelin/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Burnable} from "openzeppelin/token/ERC20/extensions/ERC20Burnable.sol";
import {SafeERC20} from "openzeppelin/token/ERC20/utils/SafeERC20.sol";

/**
 * @notice This is a mock contract for the $HAPPY token, derived from MockERC20 for testing purposes.
 * It SHOULD NOT be used in production.
 */
contract MockHappyToken is MockERC20, ERC20Permit, ERC20Burnable {
    using SafeERC20 for ERC20;

    constructor() ERC20Permit("HappyChain") {
        initialize("HappyChain", "HAPPY", 18);
    }

    /**
     * @notice Mints tokens to a specified account.
     * @param _account The account receiving minted tokens.
     * @param _amount  The amount of tokens to mint.
     */
    function mint(address _account, uint256 _amount) public {
        _mint(_account, _amount);
    }
}
