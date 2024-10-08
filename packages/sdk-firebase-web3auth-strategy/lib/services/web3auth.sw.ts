import "./web3auth.polyfill"
import type { MessageCallback, SharedWorkerServer } from "@happychain/vite-plugin-shared-worker/runtime"
import { tssLib } from "@toruslabs/tss-dkls-lib"
import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider"
import { COREKIT_STATUS, type JWTLoginParams, Web3AuthMPCCoreKit, makeEthereumSigner } from "@web3auth/mpc-core-kit"
import { config } from "./config"

// weird ts hacks to make tsc happy. it compiles to JS perfectly without it, but tsc doesn't understand the RPC setup
// TODO: would be nice to figure out how to make `declare module '*.shared-worker'` to inject these globally...
declare const worker: SharedWorkerServer // available within the context of the worker
// export declare function addMessageListener<T>(fn: MessageCallback<T>): void // this should work i believe but doesn't in dev...
export function addMessageListener(_fn: MessageCallback<unknown>): void {} // this gest stripped out by the build system and replaced with actual implementation
// shared between contexts, but does not persist.
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
ethereumSigningProvider.on("connect", (data) => worker.broadcast({ action: "connect", data }))
ethereumSigningProvider.on("disconnect", (data) => worker.broadcast({ action: "disconnect", data }))
ethereumSigningProvider.on("chainChanged", (data) => worker.broadcast({ action: "chainChanged", data }))
ethereumSigningProvider.on("accountsChanged", (data) => worker.broadcast({ action: "accountsChanged", data }))

/**
 * Exported functions
 * - init
 * - request (EIP1193Request)
 * - connect
 * - disconnect
 */
export async function init() {
    return await web3Auth.init()
}

export async function request({ method, params }: { method: string; params?: unknown[] }) {
    await poll(() => web3Auth.status !== COREKIT_STATUS.NOT_INITIALIZED)
    return await ethereumSigningProvider.request({ method, params })
}

export async function connect(jwt: JWTLoginParams) {
    await poll(() => web3Auth.status !== COREKIT_STATUS.NOT_INITIALIZED)

    // if we are already logged in, then just return the saved addresses
    if (web3Auth.status === COREKIT_STATUS.LOGGED_IN && _addresses.length) {
        return _addresses
    }

    if (state === "connecting") {
        await poll(() => state !== "connecting")
    }
    if (state === "connected") {
        return _addresses
    }
    state = "connecting"

    await web3Auth.loginWithJWT(jwt)

    // note: web3auth.status gets mutated, so we need to check here again
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
    await poll(() => web3Auth.status !== COREKIT_STATUS.NOT_INITIALIZED)

    if (["disconnecting", "disconnected"].includes(state)) {
        return
    }

    state = "disconnecting"
    await web3Auth.logout()
    state = "disconnected"
    _addresses = []
}

/**
 * Internal Util Functions
 */
function check(res: (value?: unknown) => void, condition: () => boolean) {
    if (condition()) res()
    setTimeout(() => check(res, condition), 500)
}

function poll(condition: () => boolean) {
    if (condition()) return
    return new Promise((res) => {
        check(res, condition)
    })
}
