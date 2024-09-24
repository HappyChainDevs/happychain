import { convertToViemChain, getChainFromSearchParams } from "@happychain/sdk-shared"
import { custom } from "viem"
import { createConfig } from "wagmi"
import { happyConnector } from "./connnector"
import { iframeProvider } from "./provider"

const currentChain = convertToViemChain(getChainFromSearchParams())

/**
 * Create Wagmi Config with custom connector to support HappyChain Sepolia.
 * Enables discovery of injected providers via EIP-6963 using the `mipd` library and converting to injected connectors.
 */
export const config = createConfig({
    chains: [currentChain],
    multiInjectedProviderDiscovery: false,
    transports: {
        [currentChain.id]: custom(iframeProvider),
    },
    connectors: [happyConnector],
})
