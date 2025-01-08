import { happyProvider } from "@happychain/js"
import type { CreateConnectorFn } from "wagmi"
import { injected } from "wagmi/connectors"

/**
 * A custom wagmi [Connector](https://wagmi.sh/react/api/connectors/injected) that is 
 * initialized using the HappyProvider.
 * 
 * @example
 * ### Setting up a wagmi config with our custom connector
 * ```ts twoslash
 * import { happyProvider } from "@happychain/js"
 * import { happyWagmiConnector } from "@happychain/wagmi"
 * import { createConfig, type Config } from "@wagmi/core"
 * 
 * export const config: Config = createConfig({
    chains: [sepolia],
    connectors: [happyWagmiConnector], // voila!
    transports: {
        [sepolia.id]: custom(happyProvider as HappyProvider),
    },
})
 * 
 */
export const happyWagmiConnector: CreateConnectorFn = injected({
    shimDisconnect: false,
    target() {
        return {
            id: "happyProvider",
            name: "HappyChain Wagmi Provider",
            provider: happyProvider,
        }
    },
})
