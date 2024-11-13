import "./web3auth.polyfill"
import { waitForCondition } from "@happychain/sdk-shared"
import { worker } from "@happychain/worker/runtime"
import { tssLib } from "@toruslabs/tss-dkls-lib"
import { EthereumSigningProvider } from "@web3auth/ethereum-mpc-provider"
import { COREKIT_STATUS, type JWTLoginParams, Web3AuthMPCCoreKit, makeEthereumSigner } from "@web3auth/mpc-core-kit"
import { createStore, get, set } from "idb-keyval"
import { config } from "../services/config"
export { addMessageListener } from "@happychain/worker/runtime"

const web3AuthStore = createStore("web-3-auth-db", "web-3-auth-store")

const web3AuthWorkerStorage = {
    async getItem(key: string) {
        return get(key, web3AuthStore)
    },
    async setItem(key: string, value: string) {
        return set(key, value, web3AuthStore)
    },
}

const web3AuthOptions = {
    web3AuthClientId: import.meta.env.VITE_WEB3AUTH_CLIENT_ID,
    web3AuthNetwork: config.web3AuthNetwork,
    manualSync: true,
    tssLib: tssLib,
    enableLogging: false,
    storage: web3AuthWorkerStorage,
}
const web3Auth = new Web3AuthMPCCoreKit(web3AuthOptions)

const signerProviderChainConfig = {
    chainNamespace: config.web3AuthChainNamespace,
    chainId: config.chainId,
    rpcTarget: config.rpcUrls[0],
    displayName: config.chainName,
    blockExplorerUrl: config.blockExplorerUrls?.[0],
    ticker: config.nativeCurrency.symbol,
    tickerName: config.nativeCurrency.name,
    decimals: config.nativeCurrency.decimals,
    wsTarget: undefined, // unsupported currently
}

const ethereumSigningProvider = new EthereumSigningProvider({
    config: {
        skipLookupNetwork: true,
        chainConfig: signerProviderChainConfig,
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
ethereumSigningProvider.on("disconnect", () => {
    worker.broadcast({ action: "disconnect", data: undefined })
})
ethereumSigningProvider.on("chainChanged", async (data) => {
    worker.broadcast({ action: "chainChanged", data })
})
ethereumSigningProvider.on("accountsChanged", (data) => {
    worker.broadcast({ action: "accountsChanged", data })
})

/**
 * Before calling connect(), disconnect(), or request() functions, we must verify that web3Auth
 * has been initialized. If it has not yet been initialized, this will initialize it, otherwise
 * its a no-op.
 */
async function checkInitialization() {
    if (web3Auth.status === COREKIT_STATUS.NOT_INITIALIZED) {
        await web3Auth.init()
    }
}

export async function request({ method, params }: { method: string; params?: unknown[] }) {
    await checkInitialization()
    return await ethereumSigningProvider.request({ method, params })
}

export async function isConnected() {
    await waitForCondition(() => state !== "connecting")
    return _addresses.length > 0
}

export async function connect(jwt: JWTLoginParams) {
    await checkInitialization()

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
    await checkInitialization()

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
