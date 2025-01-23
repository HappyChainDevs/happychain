import { type HappyProvider, happyProvider } from "@happy.tech/core"
import { createConfig, custom } from "@wagmi/vue"
import { sepolia } from "@wagmi/vue/chains"
export { WagmiPlugin } from "@wagmi/vue"

import { injected } from "@wagmi/vue/connectors"

/**
 * Console demo. to prompt for connection, or login, in the console try typing
 * await window.happyProvider.request({ method: 'eth_requestAccounts' })
 * or
 * await window.happyProvider.request({ method: 'wallet_requestPermissions', params: [{eth_accounts: {}}] })
 *
 * to disconnect
 * await window.happyProvider.request({ method: 'wallet_revokePermissions', params: [{eth_accounts: {}}] })
 */
// biome-ignore lint/suspicious/noExplicitAny: demo purposes only. not needed under regular usage
;(window as any).happyProvider = happyProvider

export const happyConnector = injected({
    shimDisconnect: false,
    target() {
        return {
            id: "happyProvider",
            name: "HappyChain Provider",
            provider: happyProvider,
        }
    },
})

export const config = createConfig({
    chains: [sepolia],
    multiInjectedProviderDiscovery: false, // toggle on to display native injected browsers
    connectors: [happyConnector],
    transports: {
        [sepolia.id]: custom(happyProvider as HappyProvider),
    },
})
