// Unused, to be used internally only
export { baseSepolia } from "./definitions/baseSepolia"
export { base } from "./definitions/base"
export { op } from "./definitions/op"
export { opSepolia } from "./definitions/opSepolia"
export { ethereumSepolia } from "./definitions/ethereumSepolia"

// Internal use only
export { ethereum } from "./definitions/ethereum"

// Exported from the SDK
import { devnet } from "./definitions/devnet"
import { happyChainSepolia } from "./definitions/happyChainSepolia"
export { happyChainSepolia, devnet }

// Default for both iframe and SDK.
export const defaultChain = happyChainSepolia

export type { ChainParameters } from "./utils"
