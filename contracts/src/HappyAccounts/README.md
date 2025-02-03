# HappyAccounts (TODO: This is just stub)

A minimalist and efficient alternative to ERC-4337 for account abstraction. Focused on simplicity and low-latency use cases, while maintaining essential functionality.

## Key Features

- **Minimum Viable Core**: Simplified implementation focusing on essential functionality
- **Low Latency**: Optimized for minimal network roundtrips
- **Flexible Fee Payment**: Supports both self-funding and sponsored transactions
- **No Staking Requirement**: Improved UX by removing mandatory staking
- **Simplified Gas Accounting**: Uses only two gas values (`gasLimit`, `executeGasLimit`) and a fee token

## Directory Structure

```txt
HappyAccounts/
├── core/               # Core contract implementations
│   ├── HappyEntryPoint.sol    # Main entry point for transaction handling
│   └── HappyTx.sol            # Transaction structure definitions
│
├── libs/               # Library contracts
│   └── HappyTxLib.sol         # Utilities for handling HappyTx structs
│
├── samples/            # Sample implementations
│   ├── BasicNonceManager.sol  # Simple nonce management
│   ├── ScrappyAccount.sol     # Reference account implementation
│   └── ScrappyPaymaster.sol   # Reference paymaster implementation
│
└── interfaces/         # Contract interfaces
    └── IHappyAccount.sol      # Account interface definitions
```

## Key Components

### Core Contracts

- `HappyEntryPoint.sol`: The central contract that processes all HappyAccount transactions. Handles validation, execution, and fee payment in a streamlined manner.

### Libraries

- `HappyTxLib.sol`: Utility library for encoding and decoding HappyTx structs, with efficient gas usage and minimal overhead.

### Sample Implementations

- `ScrappyAccount.sol`: A reference implementation of a HappyAccount, demonstrating basic account functionality with support for both self-funding and sponsored transactions.
- `BasicNonceManager.sol`: Simple nonce management implementation for preventing transaction replay.
- `ScrappyPaymaster.sol`: Example paymaster implementation showing how to sponsor transactions for HappyAccounts.

## Design Philosophy

HappyAccounts takes a "worse is better" approach, prioritizing:

1. **Simplicity**: Both in implementation and conceptual model
2. **Low Latency**: Optimized for quick transaction confirmation
3. **Flexibility**: Easy to extend and modify for specific use cases
4. **Practicality**: Focus on real-world usage patterns

## Trade-offs

- Higher gas overhead (21k without bundling)
- More trust required from bundlers
- No built-in mempool management

These trade-offs are intentional choices to maintain simplicity and enable low-latency operations.

## Gas Logging

For development and testing, gas measurement statements can be toggled using the Makefile commands:

```bash
# Enable gas logging
make gas-logging-on

# Disable gas logging
make gas-logging-off
```

This helps in optimizing gas usage and setting appropriate buffer values for operations.
