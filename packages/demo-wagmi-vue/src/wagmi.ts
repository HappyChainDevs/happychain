import type { Config as VueConfig } from "@wagmi/vue"
import { createHappyChainWagmiConfig, happyChainSepolia, happyProvider } from "./sdk"
export { WagmiPlugin } from "@wagmi/vue"

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

export const config = createHappyChainWagmiConfig(happyChainSepolia) as VueConfig
