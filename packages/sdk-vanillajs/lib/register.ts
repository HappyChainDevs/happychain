import { defaultChain } from "@happychain/sdk-shared"
import { devnet, ethereumSepolia, happyChainSepolia } from "@happychain/sdk-shared/lib/chains"
import type { AddEthereumChainParameter } from "viem"
import { HappyWallet } from "./happy-wallet"
import { windowId } from "./happyProvider/initialize"

/**
 * Default options, custom options will be merged in afterwards
 * merge strategy: { ...DEFAULT_OPTIONS, ...userOptions }
 */
const defaultOptions = {
    chain: defaultChain.chainId,
    chainConfigs: {
        devnet: devnet,
        testnet: happyChainSepolia,
        sepolia: ethereumSepolia,

        [defaultChain.chainId]: defaultChain,
    },
} satisfies WalletRegisterOptions<"devnet" | "testnet" | "sepolia" | typeof defaultChain.chainId>

type DefaultChains = keyof typeof defaultOptions.chainConfigs

type ChainParameters = AddEthereumChainParameter | Readonly<AddEthereumChainParameter>
type ChainConfig<SelectedChain extends string> = Record<SelectedChain, ChainParameters>

/**
 * Default Settings (with optional custom RPC)
 *
 */
type CustomRpcOptions = {
    rpcUrl?: string[] | string
    chainConfigs?: never
    chain?: never
}

/**
 * Use a built in chain option, and/or a custom RPC
 */
type SelectChainOptions<SelectedChain extends string> = {
    rpcUrl?: string[] | string
    chainConfigs?: ChainConfig<SelectedChain> & ChainConfig<string>
    chain: "devnet" | "testnet" | "sepolia"
}

/**
 * Supply a custom set of chains
 */
type CustomChainOptions<
    SelectedChain extends string,
    ChainConfigs extends ChainConfig<SelectedChain> = ChainConfig<SelectedChain> & ChainConfig<string>,
> = {
    rpcUrl?: never
    chainConfigs: ChainConfigs
    chain: keyof ChainConfigs & SelectedChain
}

export type WalletRegisterOptions<
    SelectedChain extends string,
    ChainConfigs extends ChainConfig<SelectedChain> = ChainConfig<SelectedChain> & ChainConfig<string>,
> = CustomChainOptions<SelectedChain, ChainConfigs> | SelectChainOptions<SelectedChain> | CustomRpcOptions

type ChainType<T extends WalletRegisterOptions<string>> = T extends WalletRegisterOptions<string, infer K> ? K : never

type MergedOptions<T extends WalletRegisterOptions<string>> = {
    rpcUrl?: string[] | string
    chainConfigs: ChainType<T>
    chain: keyof ChainType<T>
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
 * // ---cut---
 * register({ chain: 'testnet' })
 * ```
 *
 *
 * @example
 * Connect to a custom chain
 * ```ts twoslash
 * import { register } from '@happychain/js'
 * // ---cut---
 * register({
 *   chain: 'custom',
 *   chainConfigs: {
 *     custom: {
 *       chainName: "DevNet (localhost)",
 *       rpcUrls: ["http://127.0.0.1:8545", "ws://127.0.0.1:8545"],
 *       nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
 *       chainId: "0x7a69",
 *     }
 *   }
 * })
 * ```
 *
 */
export function register<TChain extends string = DefaultChains>(opts: WalletRegisterOptions<TChain> = {}) {
    // don't register if already exists on page
    if (document.querySelector("happy-wallet")) {
        return
    }

    // merge with defaults
    const options = { ...defaultOptions, ...opts } as MergedOptions<typeof opts>

    if (!options.chainConfigs || !options.chain || !Object.keys(options.chainConfigs).includes(options.chain)) {
        throw new Error(
            `Misconfigured chain. Attempting to connect to ${options.chain}, but only [${Object.keys(options.chainConfigs).join(",")}] are available`,
        )
    }

    const chain = options.chainConfigs && options.chain && options.chainConfigs[options.chain]

    const wallet = new HappyWallet(
        windowId,
        JSON.stringify(chain),
        Array.isArray(options.rpcUrl) ? options.rpcUrl.join(",") : options.rpcUrl,
    )

    document.body.appendChild(wallet)
}
