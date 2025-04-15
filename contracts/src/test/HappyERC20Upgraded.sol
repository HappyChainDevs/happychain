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
 * @dev An upgraded version of HappyERC20Upgradeable, to test the upgrade process.
 * This adds a field and a function that returns it to the original contract.
 *
 * @custom:oz-upgrades-from HappyERC20Upgradeable
 */
contract HappyERC20Upgraded is
    ERC20Upgradeable,
    ERC20PermitUpgradeable,
    ERC20BurnableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    // Adds safeXXX functions that revert instead of returning false.
    using SafeERC20 for ERC20Upgradeable;

    uint256 private constant INITIAL_SUPPLY = 10_000_000_000;

    string public addedField;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function reinitialize() external reinitializer(2) {
        addedField = "Chow is my love monkey";
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
