import { happyChainSepoliaViemChain } from "@happychain/sdk-shared/lib/chains/definitions/happyChainSepolia"
import { custom } from "viem"
import { createConfig } from "wagmi"
import { happyConnector } from "./connector"
import { customProvider } from "./provider"

/**
 * Create Wagmi Config with custom connector to support HappyChain Sepolia.
 * Enables discovery of injected providers via EIP-6963 using the `mipd` library and converting to injected connectors.
 */
export const config = createConfig({
    chains: [happyChainSepoliaViemChain],
    multiInjectedProviderDiscovery: true,
    transports: {
        [happyChainSepoliaViemChain.id]: custom(customProvider),
    },
    connectors: [happyConnector],
})
