# HappyAccounts

A minimalist and efficient alternative to ERC-4337 for account abstraction. Focused on simplicity and low-latency use cases, while maintaining essential functionality.

## Key Features

- **Minimum Viable Core**: Simplified implementation focusing on essential functionality
- **Low Latency**: Optimized for minimal network roundtrips
- **Flexible Fee Payment**: Supports both self-funding and sponsored transactions
- **No Staking Requirement**: Improved UX by removing mandatory staking
- **Simplified Gas Accounting**: Uses only two gas values (`gasLimit`, `executeGasLimit`)

These benefits come with intentional trade-offs: slightly higher gas costs (21k without bundling), increased trust in bundlers, and no built-in mempool management - all chosen to maintain simplicity and enable low-latency operations.

## Directory Structure

```txt
happyAccounts/
├── core/               # Core contracts required for happy-aa
│   ├── HappyEntryPoint.sol    # The entrypoint for handling happyTxs on-chain, singleton contract.
│   └── HappyTx.sol            # The definition of a happyTx.
│
├── libs/               # Library contracts
│   └── HappyTxLib.sol         # Utilities for handling HappyTx structs (encoding/decoding)
│
│
├── interfaces/         # Contract interfaces
│   └── IHappyAccount.sol      # Account interface definitions
│   └── IHappyPaymaster.sol    # Paymaster interface definitions
│
│
└── samples/            # Sample implementations of happy-aa components
    ├── BasicNonceManager.sol  # Simple nonce management for ScrappyAccount (an optional contract)
    ├── ScrappyAccount.sol     # Reference account implementation, has to be deployed separately for each user
    └── ScrappyPaymaster.sol   # Reference paymaster implementation, for sponsoring happyTxs, singleton contract
```

## Key Components

### Core Contracts

- `HappyEntryPoint.sol`: The central contract that processes all HappyAccount transactions. Handles validation, execution, and fee payment in a streamlined manner.

### Libraries

- `HappyTxLib.sol`: Utility library for encoding and decoding HappyTx structs, with efficient gas usage and minimal overhead.
