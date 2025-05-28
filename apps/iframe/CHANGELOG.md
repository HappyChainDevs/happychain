# @happy.tech/iframe

## 0.3.0

### Minor Changes

- ccc3afc: Simulates boop within the popup and transports the data to the iframe for use.
- 87df5d0: Add ability to revoke session keys.
- 61de8d9: Extend message type for popup <> iframe to include extra data.
- b5cb9da: Create blockExplorer utility hooks for fetching data using the API.
- 9ee0fec: Adds popup component for unsupported requests

### Patch Changes

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
- Updated dependencies [ccc3afc]
- Updated dependencies [87df5d0]
- Updated dependencies [61de8d9]
- Updated dependencies [5126e24]
- Updated dependencies [3f5d45f]
- Updated dependencies [8ec6dce]
  - @happy.tech/wallet-common@0.3.0
  - @happy.tech/common@0.2.0
  - @happy.tech/contracts@0.1.0
  - @happy.tech/boop-sdk@0.0.0

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
