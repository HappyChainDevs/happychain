import { type AddEthereumChainParameter, createPublicClient, createWalletClient, custom, defineChain } from 'viem'
import * as viemChainObj from 'viem/chains'
import { happyProvider } from '../lib'

export const publicClient = createPublicClient({ transport: custom(happyProvider) })

export const walletClient = createWalletClient({ transport: custom(happyProvider) })

const viemChains = Object.values(viemChainObj)
export const findViemChain = (chain: AddEthereumChainParameter) => {
    const chainId = Number(chain.chainId)
    const viemChain = viemChains.find((a) => a.id === chainId)
    if (viemChain) return viemChain

    return convertToViemChain(chain)
}

function convertToViemChain(chain: AddEthereumChainParameter) {
    const httpRpcs = chain.rpcUrls.filter((a) => a.startsWith('http'))
    const wsRpcs = chain.rpcUrls.filter((a) => a.startsWith('ws'))
    return defineChain({
        id: Number(chain.chainId),
        name: chain.chainName,
        nativeCurrency: {
            decimals: chain.nativeCurrency?.decimals ?? 18,
            name: chain.nativeCurrency?.name ?? 'Ether',
            symbol: chain.nativeCurrency?.symbol ?? 'ETH',
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
