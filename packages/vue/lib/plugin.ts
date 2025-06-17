import { loadHappyWallet } from "@happy.tech/core"
import type { LoadHappyWalletOptions } from "@happy.tech/core"
import type { App, Plugin } from "vue"

/**
 * Vue plugin to load the Happy Wallet.
 */
export const HappyChainPlugin = {
    /**
     * Installs the plugin.
     */
    install: (_app: App, options?: LoadHappyWalletOptions) => {
        // For docs display purposes, this must be an arrow func and not have a type (but use `satisfies` for checking)
        loadHappyWallet(options)
    },
} satisfies Plugin<LoadHappyWalletOptions>
