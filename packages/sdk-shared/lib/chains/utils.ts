import type { AddEthereumChainParameter } from "viem"
import { happyChainSepolia } from "./definitions/happyChainSepolia"

export const defaultChain = happyChainSepolia

/***
 * Utilities
 */
const u = new URLSearchParams(window.location.search)

function getChain() {
    const urlChainString = u.get("chain")

    if (!urlChainString) {
        return defaultChain
    }
    try {
        return JSON.parse(urlChainString)
    } catch {
        return defaultChain
    }
}

export function getChainFromSearchParams(): AddEthereumChainParameter {
    const rpcUrls = u.get("rpc-urls")?.split(",")

    const chain = getChain()

    if (rpcUrls?.length) {
        return {
            ...chain,
            rpcUrls: rpcUrls,
        }
    }

    return chain
}
