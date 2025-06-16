// Important! has to be the first import!
import "./web3auth/polyfill"

import type { Address } from "@happy.tech/common"
import { waitForCondition } from "@happy.tech/common"
import { COREKIT_STATUS, type JWTLoginParams } from "@web3auth/mpc-core-kit"
import { web3Auth } from "./web3auth/mpc-core-kit"
import { ethereumSigningProvider } from "./web3auth/signingProvider"

export { addMessageListener } from "@happy.tech/worker/runtime"

/**
 *  Global mutable variables/state
 */
let state: "connecting" | "connected" | "disconnected" | "disconnecting" = "disconnected"
let _addresses: Address[] = []

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
