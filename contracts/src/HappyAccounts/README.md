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
happy-accounts/
├── core/               # Core contracts (for use by submitters, dapps and end users to submit happyTxs)
│   ├── HappyEntryPoint.sol    # The entrypoint for handling happyTxs on-chain, singleton contract.
│   └── HappyTx.sol            # The definition of a happy-tx.
│
├── libs/               # Library contracts (for use by `core/` and account/paymaster implementations)
│   └── HappyTxLib.sol         # Utilities for handling HappyTx structs (encoding/decoding).
│
├── interfaces/         # Contract interfaces (for use by `samples/`)
│   └── IHappyAccount.sol      # Account interface definitions.
│   └── IHappyPaymaster.sol    # Paymaster interface definitions.
│
└── samples/            # Sample implementations (for use by dapps and end users to interact with core contracts)
    ├── ScrappyAccount.sol     # Reference account implementation, has to be deployed separately for each user.
    └── ScrappyPaymaster.sol   # Reference paymaster implementation, for sponsoring happyTxs.
                               # Reference paymaster implementation, for sponsoring happyTxs, singleton contract.
```
