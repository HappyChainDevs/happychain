Wallet Permission System Handling

https://eips.ethereum.org/EIPS/eip-2255
https://github.com/MetaMask/metamask-improvement-proposals/blob/main/MIPs/mip-2.md

General permission structure currently is `Map<dappOrigin, Map<PermissionName, WalletPermission>>`

where `permissionName` is `'eth_accounts' | string` and `permissionDetails` is a `WalletPermission`

These permissions are scoped to the current authenticated _user_ per dapp, and is cleared when
the user logs out or disconnected from the dapp

In a multi-account/multi-address scenario, these permissions will need to be scoped
per _address_ not per user.

Currently multi-account is not supported.
