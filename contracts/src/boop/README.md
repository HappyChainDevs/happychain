# Boop 👉🐈  

A minimalist and efficient alternative to ERC-4337 for account abstraction. Focused on simplicity and low-latency use cases, while maintaining essential functionality.

## Key Features

- **Minimum Viable Core**: Simplified implementation focusing on essential functionality
- **Low Latency**: Optimized for minimal network roundtrips
- **Flexible Fee Payment**: Supports self-funding, submitter-sponsored, and paymaster-sponsored transactions
- **Improved Staking**: Improved UX by implementing a flexible staking model for paymasters, designed from scratch
- **Simplified Gas Accounting**: Uses (`verificationGasLimit`, `executeGasLimit`, and `paymentValidationGasLimit`)

These benefits come with intentional trade-offs: slightly higher gas costs (21k without bundling), increased trust in bundlers, and no built-in mempool management - all chosen to maintain simplicity and enable low-latency operations.

## Directory Structure

```txt
boop/
├── core/                       # Core contracts
│   ├── EntryPoint.sol              # The entrypoint for handling boops on-chain, singleton contract.
│   ├── Boop.sol                    # The definition of a boop transaction.
│   ├── Staker.sol                  # Contract for staking ETH to be used as gas for boops.
│   └── Utils.sol                   # Utility functions for the core contracts.
│
├── libs/                       # Library contracts (for use by `core/` and account/paymaster implementations)
│   ├── Encoding.sol                # Encoding/Decoding boops.
│   ├── Utils.sol                   # Utilities for boop processing on-chain.
│   └── extensions/                 # Extension interfaces
│       └── CallInfoEncoding.sol        # Utilities for encoding/decoding CallInfo structs for executors.
│
├── interfaces/                 # Contract interfaces
│   ├── EventsAndErrors.sol         # Shared events and errors used across the protocol
│   ├── Types.sol                   # Shared types and enums used across the protocol
│   ├── IAccount.sol                # Account interface definitions.
│   ├── IExtensibleAccount.sol      # Interface for extensible accounts.
│   ├── IPaymaster.sol              # Paymaster interface definitions.
│   └── extensions/                 # Extension interfaces
│       ├── ICustomExecutor.sol         # Interface for custom execution methods.
│       └── ICustomValidator.sol        # Interface for custom validation methods.
│
├── extensions/                 # Extension implementations
│   ├── BatchCallExecutor.sol       # Extension for executing multiple calls in a batch.
│   └── SessionKeyValidator.sol     # Extension for validating session keys.
│
└── happychain/                 # HappyChain implementations
    ├── HappyAccount.sol            # HappyChain account implementation.
    ├── HappyAccountFactory.sol     # Factory for deploying HappyAccount contracts.
    └── HappyPaymaster.sol          # HappyChain paymaster implementation for sponsoring boops.
```
