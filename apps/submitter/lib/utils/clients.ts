import type { PublicClient as BasePublicClient, WalletClient as BaseWalletClient, Chain } from "viem"
import { createPublicClient, createWalletClient, webSocket } from "viem"
import { anvil, happychainTestnet } from "viem/chains"
import { env } from "#lib/env"

function getChain(): Chain {
    const chain = [anvil, happychainTestnet].find((chain) => chain.id === env.CHAIN_ID)
    if (chain)
        return {
            ...chain,
            rpcUrls: {
                ...chain.rpcUrls,
                default: {
                    http: env.RPC_URL ? [env.RPC_URL, ...chain.rpcUrls.default.http] : chain.rpcUrls.default.http,
                    webSocket: "webSocket" in chain.rpcUrls.default ? chain.rpcUrls.default.webSocket : undefined,
                },
            },
        }
    if (!env.RPC_URL) {
        throw new Error("Chain is not supported by default and the RPC_URL was not set in the env.")
    }
    return {
        id: env.CHAIN_ID,
        name: "Blockchain",
        rpcUrls: {
            default: {
                http: [env.RPC_URL],
                // TODO: websocket
            },
        },
        nativeCurrency: {
            symbol: "UNKNOWN",
            name: "UNKNOWN",
            decimals: 18,
        },
    }
}

export const chain: Chain = getChain()

export const config = {
    chain,
    transport: webSocket(),
    batch: {
        multicall: true,
    },
} as const

export type PublicClient = BasePublicClient<typeof config.transport, typeof config.chain>
export const publicClient: PublicClient = createPublicClient(config)

export type WalletClient = BaseWalletClient<typeof config.transport, typeof config.chain, undefined>
export const walletClient: WalletClient = createWalletClient(config)
