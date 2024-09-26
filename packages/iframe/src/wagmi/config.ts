import { convertToViemChain, getChainFromSearchParams } from "@happychain/sdk-shared"
import { custom } from "viem"
import { createConfig } from "wagmi"
import { happyConnector } from "./connnector"
import { iframeProvider } from "./provider"

// cf. https://wagmi.sh/react/typescript#declaration-merging
declare module "wagmi" {
    interface Register {
        config: typeof config
    }
}

const currentChain = convertToViemChain(getChainFromSearchParams())

/**
 * Create Wagmi Config with custom connector to support HappyChain Sepolia.
 */
export const config = createConfig({
    chains: [currentChain],
    multiInjectedProviderDiscovery: false,
    transports: {
        [currentChain.id]: custom(iframeProvider),
    },
    connectors: [happyConnector],
})
