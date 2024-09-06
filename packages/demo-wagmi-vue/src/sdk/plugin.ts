import { chains, register } from "@happychain/js"
import type { WalletRegisterOptions } from "@happychain/js"
import type { App, Plugin } from "vue"

export type HappyChainOptions = WalletRegisterOptions

export { chains }

export const HappyChainPlugin = {
    install(_app: App, options?: HappyChainOptions) {
        register(options)
    },
} satisfies Plugin<HappyChainOptions>