import { type Fn, binaryPartition, uniques } from "@happy.tech/common"
import {
    http,
    type PublicClient as BasePublicClient,
    type WalletClient as BaseWalletClient,
    type Client,
    type Transport,
    createPublicClient as viemCreatePublicClient,
    createWalletClient as viemCreateWalletClient,
    webSocket,
} from "viem"
import { anvil, happychainTestnet } from "viem/chains"
import { env } from "#lib/env"
import { blockService } from "#lib/services/index"
import { logger } from "#lib/utils/logger"
import { isNonceTooLowError } from "#lib/utils/viem"

// This file defines `publicClient` and `walletClient` as proxys that call a properly configured client
// with a RPC URL selected by the BlockService. They will use the RPCs that the BlockService finds to be live and
// updating blocks as fallback if the primary RPC fails.

// NOTE: There are a number of ways that this could be improved:
// - In BlockService, we only check which RPCs are live and updating blocks whenever we need to change the primary RPC.
//   These could be updated more often.
// - Similarly we could rotate back an RPC as the primary RPC if it comes back online.
// - These two probably requires a separate service that gathers statistics for RPCs.
// - Currently, when we enter RPC selection, the primary RPC remains the same for the duration of the selection.
//   We could instead jettison it, though given we have the fallback it's probably not a big deal.

function canonicalize(rpcs: readonly string[]): string[] {
    return uniques(
        rpcs.map((rpc) => {
            let result = rpc.trim().replace("127.0.0.1", "localhost")
            if (!rpc.includes("://")) result = `http://${result}`
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

    // TODO enable configuring custom chains
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

const transportConfig = {
    timeout: env.RPC_REQUEST_TIMEOUT,
    batch: env.USE_RPC_BATCHING ? { wait: env.RPC_BATCH_WAIT, size: env.RPC_BATCH_SIZE } : false,
} as const

export type PublicClient = BasePublicClient<Transport, typeof chain>
export type WalletClient = BaseWalletClient<Transport, typeof chain>

function createPublicClient(rpcUrl: string): PublicClient {
    return viemCreatePublicClient({
        chain,
        transport: rpcUrl.startsWith("http") ? http(rpcUrl, transportConfig) : webSocket(rpcUrl, transportConfig),
    })
}

function createWalletClient(rpcUrl: string): WalletClient {
    return viemCreateWalletClient({
        chain,
        transport: rpcUrl.startsWith("http") ? http(rpcUrl, transportConfig) : webSocket(rpcUrl, transportConfig),
    })
}

abstract class ClientProxyHandler<T extends Client> implements ProxyHandler<T> {
    abstract getCurrentClient(): T | null
    abstract createAndSetClient(url: string): T

    get(_target: T, prop: string | symbol, _receiver: unknown) {
        const url = blockService.getRpcUrl()
        let currentClient = this.getCurrentClient()
        if (!currentClient || currentClient.transport.url !== url) currentClient = this.createAndSetClient(url)
        const value = Reflect.get(currentClient, prop)
        if (typeof value !== "function") return value

        return (...args: unknown[]) => {
            const otherRpcs = blockService.getOtherLiveRpcUrls()
            for (let i = -1; i < otherRpcs.length; ++i) {
                const client = i < 0 ? this.getCurrentClient() : createWalletClient(otherRpcs[i])
                if (!client) continue // only happens at initialization time
                try {
                    return (Reflect.get(client, prop) as Fn)(...args)
                } catch (err) {
                    if (this.shouldThrow(err)) throw err
                }
            }
        }
    }

    // NOTE: Originally written for the Viem `fallback` handler and still compatible with it.
    shouldThrow(err: unknown): boolean {
        if (!(err instanceof Error)) return false

        // The cases below indicate a properly functioning RPC reporting something wrong
        // with the tx. There are properly other cases like that we haven't run into.
        // It's okay, we're just going to be less efficient by doing needless retries.

        const msg = err.message
        if (msg.includes("execution reverted")) return true
        if (msg.includes("replacement transaction underpriced")) return true
        if (msg.includes("Insufficient funds")) return true

        // This happens when resyncing and we reach max fees, ignore for `testResync.ts`, but don't ignore in general,
        // in case a RPC is dysfunctional and we would benefit from sending the tx through another RPC.
        if (env.NODE_ENV === "development" && msg.includes("transaction already imported")) return true

        // We handle this directly.
        if (isNonceTooLowError(err)) return true

        logger.warn("RPC failed, falling back to next RPC:", msg)
        return false // dont throw but proceed to the next RPC
    }
}

class PublicClientProxyHandler extends ClientProxyHandler<PublicClient> {
    #publicClient: PublicClient | null = null
    getCurrentClient() {
        return this.#publicClient
    }
    createAndSetClient(url: string) {
        this.#publicClient = createPublicClient(url)
        return this.#publicClient
    }
}

class WalletClientProxyHandler extends ClientProxyHandler<WalletClient> {
    #walletClient: WalletClient | null = null
    getCurrentClient() {
        return this.#walletClient
    }
    createAndSetClient(url: string) {
        this.#walletClient = createWalletClient(url)
        return this.#walletClient
    }
}

/**
 * Proxy to a Viem public client to be used by the submitter. The underlying client is created with the latest RPC URL
 * selected by the {@link BlockService} — this can change over time, hence the need for a proxy.
 */
export const publicClient: PublicClient = new Proxy<PublicClient>({} as PublicClient, new PublicClientProxyHandler())

/**
 * Proxy to a Viem wallet client to be used by the submitter. The underlying client is created with the latest RPC URL
 * selected by the {@link BlockService} — this can change over time, hence the need for a proxy.
 */
export const walletClient: WalletClient = new Proxy<WalletClient>({} as WalletClient, new WalletClientProxyHandler())
