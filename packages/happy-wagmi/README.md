# @happychain/wagmi

A custom wagmi [Connector](https://wagmi.sh/react/api/connectors/injected) that is initialized using the HappyProvider.

## Setting up a wagmi config with our custom connector

```ts twoslash
import { happyProvider } from "@happychain/js"
import { happyWagmiConnector } from "@happychain/wagmi"
import { createConfig, type Config } from "@wagmi/core"

export const config: Config = createConfig({
    chains: [sepolia],
    connectors: [happyWagmiConnector], // voila!
    transports: {
        [sepolia.id]: custom(happyProvider as HappyProvider),
    },
})
