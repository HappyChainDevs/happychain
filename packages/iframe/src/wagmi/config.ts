import { onlyUnique } from "@happychain/common"
import { chains as _chains, convertToViemChain } from "@happychain/sdk-shared"
import { type Chain, createClient, custom } from "viem"
import { createConfig } from "wagmi"
import { getCurrentChain } from "../state/chains"
import { happyConnector } from "./connnector"
import { iframeProvider } from "./provider"

// cf. https://wagmi.sh/react/typescript#declaration-merging
declare module "wagmi" {
    interface Register {
        config: typeof config
    }
}

const currentChain: Chain = convertToViemChain(getCurrentChain())
const allChains = Object.values(_chains).map(convertToViemChain)
const chains = [currentChain, ...allChains].filter(onlyUnique)

/**
 * Create Wagmi Config with custom connector to support HappyChain Sepolia.
 */
export const config = createConfig({
    chains: chains as unknown as readonly [Chain, ...Chain[]],
    multiInjectedProviderDiscovery: false,
    client: ({ chain }) =>
        createClient({
            chain,
            transport: custom(iframeProvider),
        }),
    connectors: [happyConnector],
})
