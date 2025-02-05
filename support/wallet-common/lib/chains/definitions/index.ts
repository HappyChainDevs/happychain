// Internal use only
import { devnetDefinition } from "./devnet"
import { ethereumDefinition } from "./ethereum"
import { happyChainSepoliaDefinition } from "./happyChainSepolia"
// export { happyChainSepoliaDefinition as happyChainSepolia }
// export const defaultChain = happyChainSepoliaDefinition

export const chainDefinitions = {
    defaultChain: happyChainSepoliaDefinition,

    // Internal use only
    ethereum: ethereumDefinition,
    devnet: devnetDefinition,
    from: happyChainSepoliaDefinition,
    happyChainSepolia: happyChainSepoliaDefinition,
}
