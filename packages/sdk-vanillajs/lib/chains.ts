import { chains, happyChainSepoliaViemChain } from "@happychain/sdk-shared"

/**
 * Localhost Anvil chain for local development.
 */
export const devnet = chains.devnet

/**
 * HappyChain Sepolia testnet.
 */
export const testnet = chains.happyChainSepolia

/**
 * Default chain that the SDK will connect to — currently this is
 * {@link testnet HappyChain Sepolia}.
 */
export const defaultChain = chains.defaultChain

/**
 * Viem [Chain](https://github.com/wevm/viem/blob/main/src/types/chain.ts) definition of HappyChain Sepolia.
 */
export const happyChainSepolia = happyChainSepoliaViemChain
