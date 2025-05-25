import { array, uniques } from "@happy.tech/common"
import {
    type PublicClient as BasePublicClient,
    type WalletClient as BaseWalletClient,
    type Chain,
    webSocket,
} from "viem"
import { http, createPublicClient, createWalletClient, fallback } from "viem"
import { anvil, happychainTestnet } from "viem/chains"
import { env } from "#lib/env"
import { logger } from "#lib/utils/logger"

function canonicalize(type: "http" | "ws", rpcs: string[]): string[] {
    return uniques(
        rpcs.map((rpc) => {
            let result = rpc.trim().replace("127.0.0.1", "localhost")
            if (!rpc.startsWith("http") && !rpc.startsWith("ws")) result = `${type}://${result}`
            if (result.endsWith("/")) result = result.slice(0, result.length - 1)
            if (result === "https://rpc.testnet.happy.tech") result = `${result}/http`
            return result
        }),
    )
}

function getChain(): Chain {
    const chain = [anvil, happychainTestnet].find((chain) => chain.id === env.CHAIN_ID)
    if (chain) {
        const http = canonicalize("http", array(env.RPC_HTTP_URL, ...chain.rpcUrls.default.http))
        const webSocket = canonicalize("ws", array(env.RPC_WS_URL, ...chain.rpcUrls.default.webSocket))
        return { ...chain, rpcUrls: { default: { http, webSocket } } }
    }
    if (!env.RPC_HTTP_URL) {
        throw new Error("Chain is not supported by default and RPC_HTTP_URL was not defined.")
    }
    return {
        id: env.CHAIN_ID,
        name: "Blockchain",
        rpcUrls: {
            default: {
                http: [env.RPC_HTTP_URL],
                webSocket: array(env.RPC_WS_URL),
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
    batch: {
        multicall: true,
    },
    transport: fallback(
        [
            ...(env.USE_WEBSOCKET ? (chain.rpcUrls.default.webSocket ?? []) : []).map((url) => webSocket(url)),
            ...chain.rpcUrls.default.http.map((url) => http(url)),
        ],
        {
            shouldThrow: (err: Error) => {
                logger.warn("RPC failed, falling back to next RPC:", err)
                return false // dont throw but proceed to the next RPC
            },
        },
    ),
} as const

export type PublicClient = BasePublicClient<typeof config.transport, typeof config.chain>
export const publicClient: PublicClient = createPublicClient(config)

export type WalletClient = BaseWalletClient<typeof config.transport, typeof config.chain, undefined>
export const walletClient: WalletClient = createWalletClient(config)
