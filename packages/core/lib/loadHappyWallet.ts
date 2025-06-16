import { defaultChain } from "@happy.tech/wallet-common"
import define from "preact-custom-element"
import { defineBadgeComponent } from "./badge/define"
import { windowId } from "./happyProvider"
import { HappyOverlay } from "./overlay/HappyOverlay"
import { HappyWallet } from "./wallet/HappyWallet"
import { isFirefox, makeIframeUrl } from "./wallet/utils"

/**
 * Options for the [`loadHappyWallet`](/sdk/js/api/functions/loadHappyWallet) function as well as React and Vue
 * providers/plugins.
 */
export type LoadHappyWalletOptions = {
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
    disableStyles?: boolean
}

/**
 * Loads the wallet into the webpage, enabling wallet actions and displaying the Happy Wallet
 * widget.
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
 */
export function loadHappyWallet(opts: LoadHappyWalletOptions = {}) {
    registerWallet(opts)
    registerOverlay(opts)
}

/**
 * Unloads the wallet from the page, preventing wallet actions and hiding the Happy Wallet widget.
 */
export function unloadHappyWallet() {
    const wallet = document.querySelector("happy-wallet")
    if (wallet) wallet.remove()
    const overlay = document.querySelector("happy-overlay")
    if (overlay) overlay.remove()
}

function registerWallet(opts: LoadHappyWalletOptions) {
    if (!customElements.get("happy-wallet")) {
        define(HappyWallet, "happy-wallet", [], { shadow: true })
        void defineBadgeComponent("happychain-connect-button", opts.disableStyles)
    }

    if (document.querySelector("happy-wallet")) return // wallet already exists

    const chainId = (opts.chainId || defaultChain.id).toString()
    const iframe = createIframeSlot(chainId)

    const wallet = document.createElement("happy-wallet")
    wallet.setAttribute("chain-id", chainId)
    wallet.setAttribute("window-id", windowId)
    wallet.appendChild(iframe)
    document.body.appendChild(wallet)
}

function registerOverlay(_opts: LoadHappyWalletOptions) {
    if (!customElements.get("happy-wallet")) {
        define(HappyOverlay, "happy-overlay", [], { shadow: true })
    }

    if (document.querySelector("happy-overlay")) return // overlay already exists

    const overlay = document.createElement("happy-overlay")
    document.body.appendChild(overlay)
}

function createIframeSlot(chainId: string) {
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

    return iframe
}
