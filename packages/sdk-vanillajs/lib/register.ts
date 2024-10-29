import { chains } from "@happychain/sdk-shared"
import define from "preact-custom-element"
import { windowId } from "./happyProvider/initialize"
import { HappyWallet } from "./wallet/HappyWallet"

/**
 * Options for the {@link register} function.
 */
export type WalletRegisterOptions = {
    /**
     * The ID of the default chain to connect to, if it exists in the Happy Wallet.
     *
     * If the chain with the given ID hasn't been added to the Happy Wallet yet, this will be
     * ignored, and you must add and switch to chain once the user is connected
     */
    chainId?: string
}

/**
 * Registers the required components and initializes the SDK
 *
 * @example
 * Connect to HappyChain Sepolia
 * ```ts twoslash
 * import { register } from '@happychain/js'
 * // ---cut---
 * register()
 * ```
 *
 * @example
 * Connect to a pre-defined chain
 * ```ts twoslash
 * import { register } from '@happychain/js'
 * import { testnet } from '@happychain/js/chains'
 * // ---cut---
 * register({ chainId: testnet.chainId })
 * ```
 *
 * @example
 * Connect to a custom chain
 * ```ts twoslash
 * import { register } from '@happychain/js'
 * // ---cut---
 * register({ chainId: "0x7a69" }) // in hex format
 * ```
 */
export function register(opts: WalletRegisterOptions = {}) {
    // don't register if already exists on page
    if (customElements.get("happy-wallet") || document.querySelector("happy-wallet")) {
        return
    }

    define(HappyWallet, "happy-wallet", [], { shadow: true })

    const wallet = document.createElement("happy-wallet")

    const chainId = opts.chainId || chains.defaultChain.chainId
    wallet.setAttribute("chain-id", chainId)
    wallet.setAttribute("window-id", windowId)

    document.body.appendChild(wallet)
}
