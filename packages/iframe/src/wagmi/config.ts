import { onlyUnique } from "@happychain/common"
import { chains as defaultChains } from "@happychain/js"
import { convertToViemChain } from "@happychain/sdk-shared"
import { createConfig } from "@wagmi/core"
import { type Chain, createClient, custom } from "viem"
import { getCurrentChain } from "../state/chains"
import { happyConnector } from "./connector"
import { iframeProvider } from "./provider"

// cf. https://wagmi.sh/react/typescript#declaration-merging
declare module "wagmi" {
    interface Register {
        config: typeof config
    }
}

const currentChain: Chain = convertToViemChain(getCurrentChain())
const chains = [currentChain, ...defaultChains].filter(onlyUnique)

/**
 * Create Wagmi Config with custom connector to support HappyChain Sepolia.
 */
export const config = createConfig({
    chains: chains as unknown as readonly [Chain, ...Chain[]],
    multiInjectedProviderDiscovery: false,
    client: ({ chain }) => createClient({ chain, transport: custom(iframeProvider) }),
    connectors: [happyConnector],
})
