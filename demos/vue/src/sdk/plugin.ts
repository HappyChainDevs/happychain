import { loadHappyWallet } from "@happy.tech/core"
import type { WalletRegisterOptions } from "@happy.tech/core"
import type { App, Plugin } from "vue"

export type HappyChainOptions = WalletRegisterOptions

export const HappyChainPlugin = {
    install(_app: App, options?: HappyChainOptions) {
        loadHappyWallet(options)
    },
} satisfies Plugin<HappyChainOptions>
