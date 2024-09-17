// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {MockERC20} from "forge-std/mocks/MockERC20.sol";
import {SafeERC20} from "openzeppelin/token/ERC20/utils/SafeERC20.sol";

/**
 * @notice This is a mock contract for the $HAPPY token, derived from MockERC20 for testing purposes.
 * It SHOULD NOT be used in production.
 */
contract MockHappyToken is MockERC20 {
    // Adds safeXXX functions that revert instead of returning false.
    using SafeERC20 for MockERC20;

    constructor() {
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

    /**
     * @dev Destroys `amount` tokens from the caller.
     * @param amount The amount of tokens to burn.
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}
