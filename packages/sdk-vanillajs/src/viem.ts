import { convertToViemChain } from "@happychain/sdk-shared"
import { type AddEthereumChainParameter, createPublicClient, createWalletClient, custom, defineChain } from "viem"
import * as viemChainObj from "viem/chains"
import { happyProvider } from "../lib"

export const publicClient = createPublicClient({ transport: custom(happyProvider) })

export const walletClient = createWalletClient({ transport: custom(happyProvider) })

const viemChains = Object.values(viemChainObj)
export const findViemChain = (chain: AddEthereumChainParameter) => {
    const chainId = Number(chain.chainId)
    const viemChain = viemChains.find((a) => a.id === chainId)
    if (viemChain) return viemChain

    return convertToViemChain(chain)
}
