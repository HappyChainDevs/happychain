import { getChains } from "@happychain/iframe/src/state/chains"
import { type AddEthereumChainParameter, defineChain } from "viem"

import { happyChainSepolia, happyChainSepoliaViemChain } from "./definitions/happyChainSepolia"

export const defaultChain = happyChainSepolia

export type ChainParameters = Readonly<AddEthereumChainParameter & { opStack?: boolean }>

export function getChainFromSearchParams(): ChainParameters {
    const chainId = new URLSearchParams(window.location.search).get("chainId")
    const chains = getChains()
    return chainId && chainId in chains //
        ? chains[chainId]
        : defaultChain
}

export function convertToViemChain(chain: ChainParameters): ReturnType<typeof defineChain> {
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
