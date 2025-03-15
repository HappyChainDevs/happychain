# @happy.tech/iframe

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

- fe5b333: Initial Release

### Patch Changes

- Updated dependencies [fe5b333]
  - @happy.tech/wallet-common@0.1.0
  - @happy.tech/common@0.1.0
  - @happy.tech/contracts@0.1.0
