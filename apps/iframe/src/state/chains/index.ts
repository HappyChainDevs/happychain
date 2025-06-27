import { chainDefinitions as defaultChains, type ChainParameters } from "@happy.tech/wallet-common"
import { chainsLegend } from "./observable"


export function getChainFromSearchParams(): ChainParameters {
    const chainId = new URLSearchParams(window.location.search).get("chainId")
    const chainKey = chainId && `0x${BigInt(chainId).toString(16)}`
    const chains = chainsLegend.get()
    return chainKey && chainKey in chains //
        ? chains[chainKey]
        : defaultChains.defaultChain
}

export function getChains() {
    return chainsLegend.get()
}

export function setChain(chain: ChainParameters) {
    chainsLegend[chain.chainId].set(chain)
}