import { defaultChain } from "@happy.tech/wallet-common"
import define from "preact-custom-element"
import { defineBadgeComponent } from "./badge/define"
import { windowId } from "./happyProvider/initialize"
import { HappyWallet } from "./wallet/HappyWallet"
import { isFirefox, makeIframeUrl } from "./wallet/utils"

/**
 * Options for the {@link loadHappyWallet} function.
 */
export type WalletRegisterOptions = {
    /**
     * The ID of the default chain to connect to, if it exists in the Happy Wallet.
     *
     * If the chain with the given ID hasn't been added to the Happy Wallet yet, this will be
     * ignored, and you must add and switch to chain once the user is connected
     */
    chainId?: string | number

    /**
     * Disable default styles on the connect badge
     */
    overrideBadgeStyles?: boolean
}

/**
 * Registers the required components and initializes the SDK
 *
 * @example
 * Connect to HappyChain Sepolia
 * ```ts twoslash
 * import { loadHappyWallet } from '@happy.tech/core'
 * // ---cut---
 * loadHappyWallet()
 * ```
 *
 * @example
 * Connect to a pre-defined chain
 * ```ts twoslash
 * import { loadHappyWallet } from '@happy.tech/core'
 * import { happyChainSepolia } from '@happy.tech/core'
 * // ---cut---
 * loadHappyWallet({ chainId: happyChainSepolia.id })
 * ```
 *
 * @example
 * Connect to a custom chain
 * ```ts twoslash
 * import { loadHappyWallet } from '@happy.tech/core'
 * // ---cut---
 * loadHappyWallet({ chainId: "0x7a69" }) // in hex format
 * ```
 */
export function loadHappyWallet(opts: WalletRegisterOptions = {}) {
    // don't register if already exists on page
    if (customElements.get("happy-wallet") || document.querySelector("happy-wallet")) {
        return
    }

    define(HappyWallet, "happy-wallet", [], { shadow: true })
    defineBadgeComponent("happychain-connect-button", opts.overrideBadgeStyles)

    const wallet = document.createElement("happy-wallet")

    const chainId = (opts.chainId || defaultChain.id).toString()
    wallet.setAttribute("chain-id", chainId)
    wallet.setAttribute("window-id", windowId)

    const iframe = document.createElement("iframe")
    iframe.slot = "frame"
    iframe.title = "happy-iframe-slot"
    iframe.src = makeIframeUrl({ windowId, chainId })
    iframe.allow = isFirefox
        ? "" // Avoid warning in Firefox (safe: permissions inherited by default)
        : "; clipboard-write 'src'" // Explicit grant needed at least for Chrome

    iframe.style.width = "100%"
    iframe.style.border = "none"
    iframe.style.height = "100%"
    wallet.appendChild(iframe)

    document.body.appendChild(wallet)
}
