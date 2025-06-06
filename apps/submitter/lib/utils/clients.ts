import { binaryPartition, uniques } from "@happy.tech/common"
import { type PublicClient as BasePublicClient, type WalletClient as BaseWalletClient, webSocket } from "viem"
import { http, createPublicClient, createWalletClient, fallback } from "viem"
import { anvil, happychainTestnet } from "viem/chains"
import { env } from "#lib/env"
import { logger } from "#lib/utils/logger"

function canonicalize(rpcs: readonly string[]): string[] {
    return uniques(
        rpcs.map((rpc) => {
            let result = rpc.trim().replace("127.0.0.1", "localhost")
            if (!rpc.startsWith("http") && !rpc.startsWith("ws")) result = `http://${result}`
            if (result.endsWith("/")) result = result.slice(0, result.length - 1)
            if (result === "https://rpc.testnet.happy.tech") result = `${result}/http`
            if (result === "wss://rpc.testnet.happy.tech") result = `${result}/ws`
            return result
        }),
    )
}

export const { chain, rpcUrls } = (() => {
    const knownChain = [anvil, happychainTestnet].find((chain) => chain.id === env.CHAIN_ID)
    const chainRpcs = knownChain?.rpcUrls.default
    const rpcUrls = canonicalize(env.RPC_URLS ?? [...(chainRpcs?.webSocket ?? []), ...(chainRpcs?.http ?? [])])
    const [http, webSocket] = binaryPartition(rpcUrls, (url) => url.startsWith("http"))

    if (!rpcUrls.length) throw Error("Chain is not supported by default and RPC_URLS was not defined.")

    const chain = knownChain
        ? { ...knownChain, rpcUrls: { default: { http, webSocket } } }
        : {
              id: env.CHAIN_ID,
              name: "Blockchain",
              rpcUrls: { default: { http, webSocket } },
              nativeCurrency: { symbol: "UNKNOWN", name: "UNKNOWN", decimals: 18 },
          }

    return { chain, rpcUrls }
})()

export const config = {
    chain,
    batch: { multicall: true },
    transport: fallback(
        rpcUrls.map((url) => (url.startsWith("http") ? http(url) : webSocket(url))),
        {
            shouldThrow: (err: Error) => {
                if (err.message.includes("execution reverted")) return true
                logger.warn("RPC failed, falling back to next RPC:", err.message)
                return false // dont throw but proceed to the next RPC
            },
        },
    ),
} as const

export type PublicClient = BasePublicClient<typeof config.transport, typeof config.chain>
export const publicClient: PublicClient = createPublicClient(config)

export type WalletClient = BaseWalletClient<typeof config.transport, typeof config.chain, undefined>
export const walletClient: WalletClient = createWalletClient(config)
