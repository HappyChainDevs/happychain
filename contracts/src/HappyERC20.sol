// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin/access/Ownable.sol";
import {ERC20Burnable} from "openzeppelin/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20, ERC20Permit} from "openzeppelin/token/ERC20/extensions/ERC20Permit.sol";
import {SafeERC20} from "openzeppelin/token/ERC20/utils/SafeERC20.sol";

/**
 * @notice The $HAPPY token, as deployed on Ethereum and testnets L1s.
 */
contract HappyERC20 is ERC20, ERC20Permit, ERC20Burnable, Ownable {
    // Adds safeXXX functions that revert instead of returning false.
    using SafeERC20 for ERC20;

    uint256 private constant INITIAL_SUPPLY = 10_000_000_000 ether;

    constructor() ERC20("HappyChain", "HAPPY") ERC20Permit("HappyChain") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @notice Allows the owner to mint tokens.
     * @param _account The account receiving minted tokens.
     * @param _amount  The amount of tokens to mint.
     */
    function mint(address _account, uint256 _amount) public onlyOwner {
        _mint(_account, _amount);
    }
}
