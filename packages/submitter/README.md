# HappyChain Submitter

A JSON-RPC service for submitting HappyTx transactions to the HappyChain network. This service acts as a permissionless submitter that can relay transactions from Happy Smart Accounts to the blockchain.

## Features

- JSON-RPC 2.0 compliant API
- Supports submitting HappyTx transactions
- Built with Fastify for high performance
- TypeScript implementation
- Proper error handling and logging

## Setup

1. Install dependencies:
```bash
make install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Build the project:
```bash
make build
```

4. Start the server:
```bash
make start
```

## API Methods

### `happy_sendTransaction`

Submits a HappyTx transaction to the network.

**Parameters:**
```typescript
{
    account: Address;          // Account sending the transaction
    gasLimit: bigint;         // Gas limit for the transaction
    executeGasLimit: bigint;  // Gas limit for execute function
    dest: Address;            // Destination address
    paymaster: Address;       // Fee payer address
    value: bigint;           // Amount in wei to transfer
    nonce: bigint;           // Account nonce
    maxFeePerGas: bigint;    // Max fee per gas
    submitterFee: bigint;    // Fee for the submitter
    callData: Hex;           // Transaction calldata
    paymasterData: Hex;      // Extra paymaster data
    validatorData: Hex;      // Validation data (e.g., signatures)
    extraData: Hex;          // Reserved for future use
}
```

**Example Request:**
```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "happy_sendTransaction",
    "params": [{
        "account": "0x...",
        "gasLimit": "0x...",
        "executeGasLimit": "0x...",
        "dest": "0x...",
        "paymaster": "0x...",
        "value": "0x0",
        "nonce": "0x1",
        "maxFeePerGas": "0x...",
        "submitterFee": "0x0",
        "callData": "0x...",
        "paymasterData": "0x",
        "validatorData": "0x...",
        "extraData": "0x"
    }]
}
```

**Response:**
```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": "0x..." // Transaction hash
}
```

## Development

- `make build`: Build the TypeScript code
- `make test`: Run tests (TODO)
- `make lint`: Run linter
- `make clean`: Clean build artifacts
