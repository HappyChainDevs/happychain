import { anvilDefinition } from "./anvil"
import { happyChainSepoliaDefinition } from "./happyChainSepolia"

export const chainDefinitions = {
    defaultChain: happyChainSepoliaDefinition,

    // Internal use only
    anvil: anvilDefinition,
    happyChainSepolia: happyChainSepoliaDefinition,
}
