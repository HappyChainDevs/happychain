# @happychain/wagmi

Simple integration of HappyWallet with [wagmi](https://wagmi.sh/`) for your dApp.

## Quick Start

```ts
import { createHappyChainWagmiConfig } from "@happychain/wagmi"
import { sepolia } from "viem/chains"

const wagmiConfig = createHappyChainWagmiConfig(sepolia)
```

That's it! This creates a complete Wagmi configuration tailored for HappyWallet, including:

- Single-chain configuration (works with any Viem chain)
- Custom HappyWallet connector
- Optimized transport layer with HappyProvider
- Disabled multi-injected provider discovery

## Advanced Setup

If you need more control, you can also set up the configuration manually:

```ts
import { happyProvider } from "@happychain/js"
import { happyWagmiConnector } from "@happychain/wagmi"
import { createConfig, custom, type Config } from "@wagmi/core"
import { sepolia } from "viem/chains"

export const config: Config = createConfig({
    chains: [sepolia],
    connectors: [happyWagmiConnector],
    multiInjectedProviderDiscovery: false,
    transports: {
        [sepolia.id]: custom(happyProvider as HappyProvider),
    },
})
```

## API Reference

### createHappyChainWagmiConfig

```ts
function createHappyChainWagmiConfig(
    chain: Chain, 
    connector = happyWagmiConnector
): Config
```

Creates a Wagmi configuration optimized for HappyWallet integration with the specified chain.

### happyWagmiConnector

A custom Wagmi [Connector](https://wagmi.sh/react/api/connectors/injected) initialized with HappyProvider. Used internally by `createHappyChainWagmiConfig` but also available for advanced use cases.
