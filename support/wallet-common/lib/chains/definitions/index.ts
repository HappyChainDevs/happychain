// Internal use only
import { anvilDefinition } from "./anvil"
import { ethereumDefinition } from "./ethereum"
import { happyChainSepoliaDefinition } from "./happyChainSepolia"
// export { happyChainSepoliaDefinition as happyChainSepolia }
// export const defaultChain = happyChainSepoliaDefinition

export const chainDefinitions = {
    defaultChain: happyChainSepoliaDefinition,

    // Internal use only
    ethereum: ethereumDefinition,
    devnet: anvilDefinition,
    from: happyChainSepoliaDefinition,
    happyChainSepolia: happyChainSepoliaDefinition,
}
