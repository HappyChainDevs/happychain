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
 * Creates a Wagmi configuration optimized for HappyWallet integration.
 *
 * This function generates a customized Wagmi configuration that enables seamless
 * integration with HappyWallet in your decentralized application. It sets up
 * a single-chain configuration with a custom transport layer using HappyProvider.
 *
 * @param chain - The blockchain network configuration object following the Chain
 *                interface from Viem. Defines the network parameters and settings.
 * @param connector - Optional HappyWallet connector instance. Defaults to
 *                   happyWagmiConnector if not specified.
 *
 * @returns A Wagmi Config object configured for HappyWallet integration, including:
 *          - Single-chain support for the specified network
 *          - Custom HappyWallet connector
 *          - Disabled multi-injected provider discovery
 *          - Custom transport layer using HappyProvider
 *
 * @example
 * ```ts twoslash
 * import { createHappyChainWagmiConfig, happyChainSepoliaViemChain } from "@happychain/wagmi"
 * // ---cut---
 * const config = createHappyChainWagmiConfig(mainnet)
 * ```
 *
 * @see {@link https://wagmi.sh/react/api/createConfig#config Wagmi Config Documentation}
 * @see {@link https://viem.sh/docs/glossary/types#chain Viem Chain Type}
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
