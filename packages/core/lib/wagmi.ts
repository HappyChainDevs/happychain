import { type Chain, happyChainSepolia } from "@happy.tech/wallet-common"
import { type Config, type CreateConnectorFn, createConfig, custom, injected } from "@wagmi/core"
import { happyProvider } from "./happyProvider"
import { loadHappyWallet } from "./loadHappyWallet"

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
 * const result = await connect(config, { connector: config.connectors[0] })
 */
export function happyWagmiConnector(): CreateConnectorFn {
    const connectorFn = injected({
        shimDisconnect: false,
        target() {
            return {
                id: "happyProvider",
                name: "Happy Wallet",
                provider: happyProvider,
            }
        },
    })

    return (...args) => {
        const connector = connectorFn(...args)
        const onConnect = connector.onConnect.bind(connector)
        connector.onConnect = (connectInfo) => {
            onConnect(connectInfo)
            loadHappyWallet({ chainId: connectInfo.chainId })
        }
        return connector
    }
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
export function createHappyChainWagmiConfig(chain: Chain = happyChainSepolia): Config {
    return createConfig({
        chains: [chain],
        connectors: [happyWagmiConnector()],
        multiInjectedProviderDiscovery: false,
        transports: {
            [chain.id]: custom(happyProvider),
        },
    })
}
