import type { AddEthereumChainParameter } from "viem"
import { chainDefinitions } from "./definitions"
import { type Chain, happyChainSepolia } from "./viem"

export type ChainParameters = Readonly<AddEthereumChainParameter & { opStack?: boolean }>

export function convertToViemChain(chain: ChainParameters): Chain {
    if (chain.chainId === chainDefinitions.happyChainSepolia.chainId) {
        return happyChainSepolia
    }

    const httpRpcs = chain.rpcUrls.filter((a) => a.startsWith("http"))
    const wsRpcs = chain.rpcUrls.filter((a) => a.startsWith("ws"))

    return {
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
    }
}
