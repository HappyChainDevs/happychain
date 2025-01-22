import type { Chain } from "viem"
import { devnet } from "./devnet"
import { happyChainSepolia } from "./happyChainSepolia"
export { devnet, happyChainSepolia }

/**
 * The default chain to use. Right now this is Happy Chain Sepolia.
 */
export const defaultChain: Chain = happyChainSepolia

/**
 * Array of all supported HappyChain chains.
 */
export const chains: Chain[] = [devnet, happyChainSepolia]

/**
 * Map of supported chain IDs to chain objects.
 */
export const chainsById = new Map(chains.map((chain) => [chain.id, chain]))
