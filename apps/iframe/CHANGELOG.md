# @happy.tech/iframe

## 0.3.0

### Minor Changes

- 8369c2a: Added a 50-entry limit for confirmed Boops and a button in the activity view linking to the block explorer for older history.
- 7b0a160: Add support for wallet_sendTransaction RPC request.
- 9b301e4: Add ordering algorithm for boops within the wallet's activity view.
- ccc3afc: Simulates boop within the popup and transports the data to the iframe for use.
- 87df5d0: Add ability to revoke session keys.
- 61de8d9: Extend message type for popup <> iframe to include extra data.
- b5cb9da: Create blockExplorer utility hooks for fetching data using the API.
- 9ee0fec: Adds popup component for unsupported requests

### Patch Changes

- 812bca6: Fix condition for removing a watched asset from wallet view.
- fd36c37: Unify export method for components to use named imports.
- eab282a: Fix padding in various screens / components in the iframe.
- 4cb4b42: Remove `disabled` prop from input fields in import token dialog.
- 6476de1: Implement navigation state manager to preserve UI state across page navigation.
- 72809ef: Fix parent scroll lock trigger issue for secondary options menu component.
- 259b195: Update phosphor icon package, use updated icon imports.
- 96cd185: Fix permissions display scroll issue.
- 9e510e1: Fix condition for displaying a user's asset balance.
- 5d7086f: Update back button to go back in history state.
- 89f1941: Use existing menu trigger comopnent for secondary actions menu.
- 8c46ef3: Put a skeleton on the HAPPY balance when it is loading the first time.
- e3936a9: improve firebase connection logic and error handling
- 5f435cf: Fix interactivity for input fields in `Import Tokens` dialog.
- 25a7aa1: Fix to refetch token balances when wallet is opened.
- 26579d6: Add visual indicator with iframe view for the permissions / logout menu.
- 0cf4e79: Filter 'getPermissions' by requested caveat
- 39ab037: Fix ABI decoded data display in eth_sendTransaction request popup display.
- 51b7d09: Enhance FormSend component with warning message for pending transactions.
- dc29893: Add refetch options to useSimulate hook for popup window focus states.
- 3f5d45f: Add new happychain icon
- a9130df: Avoid refreshing the page on login error
- dbf69eb: Synchronises address display component styles.
- a9130df: Fix injected wallet login.
- a9130df: Almost entirely eliminate Firebase login errors
- a9130df: Visually rework the send screen.
- a178728: Fix wallet icon color on dark mode (invert color).
- 6cd9239: Parse token decimals in send assets form with != 18 decimals.
- e6394a5: Display error inline message in send transaction request popup.
- 0714b65: Prevent user from confirming tx in popup if they have 0 $HAPPY.
- 8ec6dce: Fix return type for `happy_requestSessionKey`.
- 155f0d8: Refetch user balance whenever wallet is opened.
- bcb0ae3: Fix layout shift in home page due to scrollbar.
- Updated dependencies

## 0.2.1

### Patch Changes

- mitigate incidence of firebase connection issues, and back it possible to retry without a refresh
- fix connection with injected wallets
- fix user address when connecting via injected wallet
- improve send asset UI
- clean up and normalize request popups

## 0.2.0

### Minor Changes

- c7314ca: introduce session keys management UI
- a4b7aee: temporary redesign
- 4282d08: Display warning when confirmation popup is blocked during a request
- 480828e: The activity view now handles failed transactions correctly (won't stay stuck in pending), previous pending transactions are monitored on new load, and the ordering of transactions is now mostly chronological (race conditions are possible when spamming).
- 92e9f5a: Prettify & normalize approval popups
- 3860138: redesign activity tab, differenciate operations in activity details

### Patch Changes

- Updated dependencies [4282d08]
  - @happy.tech/wallet-common@0.2.0
  - @happy.tech/contracts@0.1.0
  - @happy.tech/common@0.1.0

## 0.1.0

### Minor Changes

- Initial release

### Patch Changes

- Updated dependencies [fe5b333]
  - @happy.tech/wallet-common@0.1.0
  - @happy.tech/common@0.1.0
  - @happy.tech/contracts@0.1.0
