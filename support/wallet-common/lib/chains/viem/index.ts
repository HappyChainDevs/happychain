import { anvil } from "./anvil"
import { happyChainSepolia } from "./happyChainSepolia"
import type { Chain } from "./type"
export { anvil, happyChainSepolia }

/**
 * The default chain to use. Right now this is Happy Chain Sepolia.
 */
export const defaultChain: Chain = happyChainSepolia

/**
 * Array of all supported HappyChain chains.
 */
export const chains: Chain[] = [anvil, happyChainSepolia]

/**
 * Map of supported chain IDs to chain objects.
 */
export const chainsById = new Map(chains.map((chain) => [chain.id, chain]))

export type { Chain }
export type { ChainBlockExplorer, ChainContract, ChainNativeCurrency, ChainRpcUrls } from "./type"
