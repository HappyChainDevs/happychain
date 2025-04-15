// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {SafeERC20} from "openzeppelin/token/ERC20/utils/SafeERC20.sol";
import {OwnableUpgradeable} from "oz-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "oz-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ERC20BurnableUpgradeable} from "oz-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import {
    ERC20Upgradeable, ERC20PermitUpgradeable
} from "oz-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";

/**
 * @notice An upgradeable version of the $HAPPY token, as deployed on Ethereum and testnets L1s.
 * @dev Writing upgradeable contracts: https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable
 * @custom:oz-upgrades
 */
contract HappyERC20Upgradeable is
    ERC20Upgradeable,
    ERC20PermitUpgradeable,
    ERC20BurnableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // Adds safeXXX functions that revert instead of returning false.
    using SafeERC20 for ERC20Upgradeable;

    uint256 private constant INITIAL_SUPPLY = 10_000_000_000 ether;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC20_init("HappyChain", "HAPPY");
        __ERC20Permit_init("HappyChain");
        __Ownable_init(msg.sender);
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

    /// @dev Only the owner is authorized to upgrade this contract (otherwise reverts).
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
