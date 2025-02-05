import type { Prettify } from "@happy.tech/common"
import type { AddEthereumChainParameter, Assign, Chain, ChainFormatters } from "viem"
import { happyChainSepolia as happyChainSepoliaAddDef } from "./definitions"
import { happyChainSepoliaViemChain } from "./viem"

export type ChainParameters = Readonly<AddEthereumChainParameter & { opStack?: boolean }>

export function defineChain<formatters extends ChainFormatters, const chain extends Chain<formatters>>(
    chain: chain,
): Prettify<Assign<Chain<undefined>, chain>> {
    return {
        formatters: undefined,
        fees: undefined,
        serializers: undefined,
        ...chain,
    } as Assign<Chain<undefined>, chain>
}

export function convertToViemChain(chain: ChainParameters): ReturnType<typeof defineChain> {
    if (chain.chainId === happyChainSepoliaAddDef.chainId) {
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
