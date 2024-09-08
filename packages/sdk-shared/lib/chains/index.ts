// internal testing, not exposed through SDK
export { baseSepolia } from "./definitions/baseSepolia"
export { base } from "./definitions/base"
export { ethereum } from "./definitions/ethereum"
export { op } from "./definitions/op"
export { opSepolia } from "./definitions/opSepolia"
export { ethereumSepolia } from "./definitions/ethereumSepolia"

// exported through SDK
import { devnet } from "./definitions/devnet"
import { happyChainSepolia } from "./definitions/happyChainSepolia"
export { happyChainSepolia, devnet }

// default to be used on both iframe and sdk setups
export const defaultChain = happyChainSepolia

export type { ChainParameters } from "./utils"
