import { type AddEthereumChainParameter, defineChain } from "viem"

import { happyChainSepolia as happyChainSepoliaAddDef } from "./definitions"
import { happyChainSepolia } from "./viem"

export type ChainParameters = Readonly<AddEthereumChainParameter & { opStack?: boolean }>

// TODO delete this function after the web3auth logic is migrated to the iframe package
export function getChainFromSearchParams(): ChainParameters {
    return happyChainSepoliaAddDef
}

export function convertToViemChain(chain: ChainParameters): ReturnType<typeof defineChain> {
    if (chain.chainId === happyChainSepoliaAddDef.chainId) {
        return happyChainSepolia
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
