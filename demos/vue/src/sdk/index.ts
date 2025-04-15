/**
 * Mock stand-in for potential vue sdk
 */

export * from "@happy.tech/core"
export { useHappyWallet } from "./hooks/useHappyWallet"
export { HappyChainPlugin } from "./plugin"
export type { HappyChainOptions } from "./plugin"
export { createHappyChainWagmiConfig, happyChainSepolia } from "@happy.tech/core"
