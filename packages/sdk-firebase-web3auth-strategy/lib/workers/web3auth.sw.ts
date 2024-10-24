import "./web3auth.polyfill"
import { waitForCondition } from "@happychain/sdk-shared"
import type { MessageCallback, ServerInterface } from "@happychain/worker/runtime"
import { tssLib } from "@toruslabs/tss-dkls-lib"
import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider"
import { COREKIT_STATUS, type JWTLoginParams, Web3AuthMPCCoreKit, makeEthereumSigner } from "@web3auth/mpc-core-kit"
import { config } from "../services/config"

declare const worker: ServerInterface // available within the context of the worker
export declare function addMessageListener<T>(_fn: MessageCallback<T>): void

// if persisting is desirable, we can use IndexedDB as IAsyncStorage
const web3AuthWorkerStorage = {
    cache: new Map(),
    getItem(key: string) {
        return this.cache.get(key)
    },
    setItem(key: string, value: string) {
        return this.cache.set(key, value)
    },
}

const web3Auth = new Web3AuthMPCCoreKit({
    web3AuthClientId: import.meta.env.VITE_WEB3AUTH_CLIENT_ID,
    web3AuthNetwork: config.web3AuthNetwork,
    manualSync: true,
    tssLib: tssLib,
    enableLogging: false,
    storage: web3AuthWorkerStorage,
})

const ethereumSigningProvider = new EthereumSigningProvider({
    config: {
        skipLookupNetwork: true,
        chainConfig: {
            chainNamespace: config.web3AuthChainNamespace,
            chainId: config.chainId,
            rpcTarget: config.rpcUrls[0],
            displayName: config.chainName,
            blockExplorerUrl: config.blockExplorerUrls?.[0],
            ticker: config.nativeCurrency.symbol,
            tickerName: config.nativeCurrency.name,
            decimals: config.nativeCurrency.decimals,
            wsTarget: undefined, // unsupported currently
        },
    },
})
ethereumSigningProvider.setupProvider(makeEthereumSigner(web3Auth))

/**
 *  Global mutable variables/state
 */
let state: "connecting" | "connected" | "disconnected" | "disconnecting" = "disconnected"
let _addresses: `0x${string}`[] = []

/**
 * Proxy all provider events to iframe provider
 */
ethereumSigningProvider.on("connect", async (data) => {
    worker.broadcast({ action: "connect", data })
})
ethereumSigningProvider.on("disconnect", (data) => {
    worker.broadcast({ action: "disconnect", data })
})
ethereumSigningProvider.on("chainChanged", async (data) => {
    worker.broadcast({ action: "chainChanged", data })
})
ethereumSigningProvider.on("accountsChanged", (data) => {
    worker.broadcast({ action: "accountsChanged", data })
})

export async function init() {
    await web3Auth.init()
}

export async function request({ method, params }: { method: string; params?: unknown[] }) {
    await waitForCondition(() => web3Auth.status !== COREKIT_STATUS.NOT_INITIALIZED)
    return await ethereumSigningProvider.request({ method, params })
}

export async function isConnected() {
    await waitForCondition(() => state !== "connecting")
    return _addresses.length > 0
}

export async function connect(jwt: JWTLoginParams) {
    await waitForCondition(() => web3Auth.status !== COREKIT_STATUS.NOT_INITIALIZED)

    // if we are already logged in, then just return the saved addresses
    if (web3Auth.status === COREKIT_STATUS.LOGGED_IN && _addresses.length) {
        return _addresses
    }

    // avoid multiple concurrent calls
    await waitForCondition(() => state !== "connecting")

    if (state === "connected" && _addresses.length) {
        return _addresses
    }

    state = "connecting"

    await web3Auth.loginWithJWT(jwt)

    if (web3Auth.status === COREKIT_STATUS.LOGGED_IN) {
        await web3Auth.commitChanges()
    }

    const addresses = await ethereumSigningProvider.request({ method: "eth_accounts" })

    if (
        !addresses ||
        !Array.isArray(addresses) ||
        !addresses.every((a) => typeof a === "string" && a.startsWith("0x"))
    ) {
        state = "disconnected"
        _addresses = []
        throw new Error("[web3Auth] Failed to retrieve addresses")
    }

    // update global addresses
    _addresses = [...addresses]
    state = "connected"
    return _addresses
}

export async function disconnect() {
    await waitForCondition(() => web3Auth.status !== COREKIT_STATUS.NOT_INITIALIZED)

    if (["disconnecting", "disconnected"].includes(state)) {
        return
    }

    state = "disconnecting"
    try {
        await web3Auth.logout()
    } catch {}
    state = "disconnected"
    _addresses = []
}
