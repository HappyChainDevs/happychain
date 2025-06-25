# Boop 👉🐈  

Boop is an account abstraction system focused on simplicity and enabling low-latency chain
interactions, featuring a well thought-out extension system. To learn more, read the [introductory
article][boop-article].

[boop-article]: https://mirror.xyz/0x20Af38e22e1722F97f5A1b5afc96c00EECd566b2/x-u881uWh93iVHCnh8ELsFNh1_UJDopvyb4NoSy-Tos

## Directory Structure

```txt
boop/
├── core/                       # Core contracts
│   ├── EntryPoint.sol              # Singleton contract to which all boops are posted.
│   └── Staking.sol                  # Paymaster staking logic inherited by the entry point.
│
├── libs/                       # Library contracts (for use by `core/` and account/paymaster implementations)
│   ├── Encoding.sol                # Encoding/Decoding boops.
│   ├── Utils.sol                   # Utilities for boop processing on-chain.
│   └── extensions/                 # Extension interfaces
│       └── CallInfoEncoding.sol        # Utilities for encoding/decoding CallInfo structs for executors.
│
├── interfaces/                 # Contract interfaces
│   ├── IAccount.sol                # Account interface definitions.
│   ├── IExtensibleAccount.sol      # Interface for extensible accounts.
│   ├── IPaymaster.sol              # Paymaster interface definitions.
│   ├── EventsAndErrors.sol         # Shared events and errors used across the protocol
│   ├── Types.sol                   # Shared types and enums used across the protocol
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
