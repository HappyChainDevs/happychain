import { type AddEthereumChainParameter, defineChain } from "viem"

import { happyChainSepolia, happyChainSepoliaViemChain } from "./definitions/happyChainSepolia"

export const defaultChain = happyChainSepolia

export type ChainParameters = Readonly<AddEthereumChainParameter & { opStack?: boolean }>

/***
 * Utilities
 */
function getChain() {
    const urlChainString = new URLSearchParams(window.location.search).get("chain")

    if (!urlChainString) {
        return defaultChain
    }
    try {
        return JSON.parse(urlChainString)
    } catch {
        return defaultChain
    }
}

export function getChainFromSearchParams(): ChainParameters {
    const rpcUrls = new URLSearchParams(window.location.search).get("rpc-urls")?.split(",")

    const chain = getChain()

    if (rpcUrls?.length) {
        return {
            ...chain,
            rpcUrls: rpcUrls,
        }
    }

    return chain
}

export function convertToViemChain(chain: ChainParameters) {
    if (chain.chainId === happyChainSepolia.chainId) {
        return happyChainSepoliaViemChain
    }

    const httpRpcs = chain.rpcUrls.filter((a) => a.startsWith("http"))
    const wsRpcs = chain.rpcUrls.filter((a) => a.startsWith("ws"))

    return defineChain({
        id: Number(chain.chainId),
        name: chain.chainName,
        nativeCurrency: {
            decimals: chain.nativeCurrency?.decimals ?? 18,
            name: chain.nativeCurrency?.name ?? "Ether",
            symbol: chain.nativeCurrency?.symbol ?? "ETH",
        },
        rpcUrls: {
            default: {
                http: httpRpcs,
                webSocket: wsRpcs,
            },
        },
        ...(chain.blockExplorerUrls?.length && {
            blockExplorers: {
                default: {
                    name: `${chain.chainName} Explorer`,
                    url: chain.blockExplorerUrls[0],
                },
            },
        }),
    })
}
