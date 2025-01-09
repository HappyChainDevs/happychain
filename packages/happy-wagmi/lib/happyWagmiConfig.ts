import { type HappyProvider, happyProvider } from "@happychain/js"
import { type Config, type CreateConnectorFn, createConfig, custom, injected } from "@wagmi/core"
import type { Chain } from "@wagmi/core/chains"

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

/**
 * Creates a Wagmi configuration for HappyWallet integration.
 *
 * // todo af
 * @param chain - The network to connect to (e.g., mainnet, testnet)
 * @param connector - Optional custom wallet connector, defaults to happyWagmiConnector
 *
 * @returns Config - A Wagmi configuration object with specified chain and connector settings
 *
 * @example
 * // Using default connector
 * const config = createHappyWagmiConfig(mainnet)
 *
 * // Using custom connector
 * const config = createHappyWagmiConfig(testnet, myCustomConnector)
 */
export function createHappyChainWagmiConfig(chain: Chain, connector = happyWagmiConnector): Config {
    return createConfig({
        chains: [chain],
        connectors: [connector],
        multiInjectedProviderDiscovery: false,
        transports: {
            [chain.id]: custom(happyProvider as HappyProvider),
        },
    })
}
