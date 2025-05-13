import { onlyUnique } from "@happy.tech/common"
import { convertToViemChain, chains as defaultChains } from "@happy.tech/wallet-common"
import { createConfig } from "@wagmi/core"
import { type Chain, createClient, custom } from "viem"
import { getCurrentChain } from "../state/chains"
import { iframeProvider } from "./provider"

// cf. https://wagmi.sh/react/typescript#declaration-merging
declare module "wagmi" {
    interface Register {
        config: typeof config
    }
}

const currentChain = convertToViemChain(getCurrentChain())
const chains = [currentChain, ...defaultChains].filter(onlyUnique) as [Chain, ...Chain[]]

/**
 * Create Wagmi Config with custom client for our internal iframeProvider.
 *
 * note: do not set the connector here as it will result in a circular dependency
 * with the InjectedProviderProxy. Instead we pass the connector explicitly to the connect
 * function
 */
export const config = createConfig({
    chains,
    multiInjectedProviderDiscovery: false,
    client: ({ chain }) => createClient({ chain, transport: custom(iframeProvider) }),
})
