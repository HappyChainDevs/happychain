import { type Config, type CreateConnectorFn, createConfig, custom, injected } from "@wagmi/core"
import type { Chain } from "@wagmi/core/chains"
import type { HappyProvider } from "../happyProvider/happyProvider"
import { happyProvider } from "../happyProvider/initialize"

/**
 * A custom wagmi [Connector](https://wagmi.sh/react/api/connectors/injected) that is
 * initialized using the HappyProvider.
 *
 * @example
 * ### Setting up a wagmi config with our custom connector
 * ```ts twoslash
 * import { happyProvider, happyWagmiConnector, happyChainSepolia } from "@happy.tech/core"
 * import { type Config, createConfig, custom } from "@wagmi/core"
 *
 * export const config: Config = createConfig({
 *  chains: [happyChainSepolia],
 *  connectors: [happyWagmiConnector], // voila!
 *  transports: {
 *      [happyChainSepolia.id]: custom(happyProvider),
 *  },
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
 * Creates a single-chain Wagmi configuration for use with the HappyWallet.
 *
 * @example
 * ```ts twoslash
 * import { createHappyChainWagmiConfig, happyChainSepolia } from "@happy.tech/core"
 * // ---cut---
 * const config = createHappyChainWagmiConfig(happyChainSepolia)
 * ```
 *
 * @see {@link https://wagmi.sh/react/api/createConfig#config Wagmi Config Documentation}
 * @see {@link https://viem.sh/docs/glossary/types#chain Viem Chain Type}
 */
export function createHappyChainWagmiConfig(chain: Chain, connector: CreateConnectorFn = happyWagmiConnector): Config {
    return createConfig({
        chains: [chain],
        connectors: [connector],
        multiInjectedProviderDiscovery: false,
        transports: {
            [chain.id]: custom(happyProvider as HappyProvider),
        },
    })
}
