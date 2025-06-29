# @happy.tech/core

## 0.4.0

### Minor Changes

- a9130df: Add utilities to create Viem clients.
- 9f1bcd5: Rename provider interface / implementation to HappyProvider / HappyProviderImplem.
- ea14fb5: Fix ConnectButton element name
- 4cd8da2: Simplify custom styling for the ConnectButton
- add `revokeSessionKey`

### Patch Changes

- 08dcf66: Fix drag handler getting stuck dragging on non-chrome browsers
- 4cd8da2: update how to disable styles on connect button
- 0da44ab: Rename BadgeProps to ConnectButtonProps.
- 3f5d45f: Add new happychain icon
- 1b07b8a: Allow rpc requests as soon as iframe/wallet is ready to accept them

## 0.2.1

### Patch Changes

- d585e3a: fix iframe url in package release

## 0.2.0

### Minor Changes

- 4282d08: Display warning when confirmation popup is blocked during a request

### Patch Changes

- fa37f4c: Update loading animation

## 0.1.2

### Patch Changes

- Set proper iframe URL (for real this time).
- Avoid initialization error when peer dependency @wagmi/core is not present.

## 0.1.1

### Patch Changes

- Set proper iframe URL.

## 0.1.0

- Initial release
