import { createHappyChainWagmiConfig, getChain, happyProvider } from "@happy.tech/core"
import { HappyChainPlugin } from "@happy.tech/vue"
import { type Config as WagmiConfig, WagmiPlugin } from "@wagmi/vue"
import { createApp } from "vue"
import App from "./App.vue"
import { VueQueryPlugin, queryClient } from "./query"

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

const chainId = Number(import.meta.env.VITE_CHAIN_ID)

export const config = createHappyChainWagmiConfig(getChain(chainId)) satisfies WagmiConfig

createApp(App)
    .use(HappyChainPlugin, { chainId })
    .use(WagmiPlugin, { config })
    .use(VueQueryPlugin, { queryClient })
    .mount("#app")
