// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin/access/Ownable.sol";

contract HappyAccountRegistry is Ownable {
    mapping(address => bool) public isAuthorizedFactory;
    mapping(address account => address factory) public registeredAccounts;

    constructor() Ownable(tx.origin) {}

    modifier onlyAuthorizedFactory() {
        require(isAuthorizedFactory[msg.sender], "Not an authorized factory");
        _;
    }

    function setAuthorizedFactory(address factory, bool isAuthorized) external onlyOwner {
        isAuthorizedFactory[factory] = isAuthorized;
    }

    function addRegisteredAccount(address account) external onlyAuthorizedFactory {
        require(registeredAccounts[account] == address(0), "Account already registered");
        registeredAccounts[account] = msg.sender;
    }
}
