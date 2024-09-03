import { chains } from "@happychain/sdk-shared"
import type { AddEthereumChainParameter } from "viem"
import { HappyWallet } from "./happy-wallet"
import { windowId } from "./happyProvider/initialize"

/**
 * Default options, custom options will be merged in afterwards
 * merge strategy: { ...DEFAULT_OPTIONS, ...userOptions }
 */
const defaultOptions = {
    chain: chains.defaultChain,
} satisfies WalletRegisterOptions

type ChainParameters = AddEthereumChainParameter | Readonly<AddEthereumChainParameter>

/**
 * Use a built in chain option, and/or a custom RPC
 */

export type WalletRegisterOptions = {
    rpcUrl?: string[] | string
    chain?: ChainParameters
}

/**
 * Registers the required components and initializes the SDK
 *
 * @example
 * Basic Example
 * ```ts twoslash
 * import { register } from '@happychain/js'
 * // ---cut---
 * register()
 * ```
 *
 * @example
 * Connect to a custom RPC
 * ```ts twoslash
 * import { register } from '@happychain/js'
 * // ---cut---
 * register({ rpcUrl: 'https://....' })
 * ```
 *
 *
 * @example
 * Connect to a pre-defined chain
 * ```ts twoslash
 * import { register } from '@happychain/js'
 * import { testnet } from '@happychain/js/chains'
 * // ---cut---
 * register({ chain: testnet })
 * ```
 *
 *
 * @example
 * Connect to a custom chain
 * ```ts twoslash
 * import { register } from '@happychain/js'
 * // ---cut---
 * register({
 *   chain: {
 *     chainName: "DevNet (localhost)",
 *     rpcUrls: ["http://127.0.0.1:8545", "ws://127.0.0.1:8545"],
 *     nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
 *     chainId: "0x7a69",
 *   }
 * })
 * ```
 *
 */
export function register(opts: WalletRegisterOptions = {}) {
    // don't register if already exists on page
    if (document.querySelector("happy-wallet")) {
        return
    }

    // merge with defaults
    const options = { ...defaultOptions, ...opts } satisfies WalletRegisterOptions

    if (!options.chain) {
        throw new Error("Missing chain")
    }

    const wallet = new HappyWallet(
        windowId,
        JSON.stringify(options.chain),
        Array.isArray(options.rpcUrl) ? options.rpcUrl.join(",") : options.rpcUrl,
    )

    document.body.appendChild(wallet)
}
