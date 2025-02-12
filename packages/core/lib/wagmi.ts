import { type Config, type CreateConnectorFn, createConfig, custom, injected } from "@wagmi/core"
import type { Chain } from "@wagmi/core/chains"

// - We're excluding `@happy.tech/core` from the wagmi export to prevent it from rebundling
//   the provider code in the main export.
// - We can't use a top-level import has that causes TSC to error (since technically when
//   building, `@happy.tech/core` is this package and doesn't exist yet).
// - The string concatenation similarly prevents TSC from seeing through the import.
//   Bun however picks it up just fine.
// - For requires targeting recent browsers (Vite: `build: { target: "esnext" }`)
const { happyProvider } = await import("@happy.tech" + "/core")

/**
 * A custom wagmi [Connector](https://wagmi.sh/react/api/connectors/injected) that is
 * initialized using the HappyProvider.
 *
 * @example
 * ### Connecting with the custom wagmi connector
 * ```ts twoslash
 * import { happyProvider, happyWagmiConnector, happyChainSepolia } from "@happy.tech/core"
 * import { type Config, createConfig, custom } from "@wagmi/core"
 * import { connect } from "@wagmi/core"
 *
 * export const config: Config = createConfig({
 *  chains: [happyChainSepolia],
 *  connectors: [happyWagmiConnector()], // voila!
 *  transports: {
 *      [happyChainSepolia.id]: custom(happyProvider),
 *  },
 * })
 *
 * const result = await connect(config, { connector: happyWagmiConnector() })
 */
export function happyWagmiConnector(): CreateConnectorFn {
    return injected({
        shimDisconnect: false,
        target() {
            return {
                id: "happyProvider",
                name: "HappyChain Wagmi Provider",
                provider: happyProvider,
            }
        },
    })
}

/**
 * Creates a single-chain Wagmi configuration for use with the HappyWallet.
 *
 * @example
 * ```ts twoslash
 * import { createHappyChainWagmiConfig, happyChainSepolia } from "@happy.tech/core"
 * import { connect } from "@wagmi/core"
 *
 * const config = createHappyChainWagmiConfig(happyChainSepolia)
 * const result = await connect(config, {connector: config.connectors[0]})
 * ```
 *
 * @see {@link https://wagmi.sh/react/api/createConfig#config Wagmi Config Documentation}
 * @see {@link https://viem.sh/docs/glossary/types#chain Viem Chain Type}
 */
export function createHappyChainWagmiConfig(chain: Chain): Config {
    return createConfig({
        chains: [chain],
        connectors: [happyWagmiConnector()],
        multiInjectedProviderDiscovery: false,
        transports: {
            [chain.id]: custom(happyProvider),
        },
    })
}
