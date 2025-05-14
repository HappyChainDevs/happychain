import { loadHappyWallet } from "@happy.tech/core"
import type { LoadHappyWalletOptions } from "@happy.tech/core"
import type { App, Plugin } from "vue"

export type HappyChainOptions = LoadHappyWalletOptions

/**
 * Vue plugin to load the Happy Wallet.
 */
export const HappyChainPlugin = {
    install(_app: App, options?: HappyChainOptions) {
        loadHappyWallet(options)
    },
} satisfies Plugin<HappyChainOptions>
