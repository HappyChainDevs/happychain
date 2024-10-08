import SafeEventEmitter from "@metamask/safe-event-emitter"
import type { JWTLoginParams } from "@web3auth/mpc-core-kit"
import type { EIP1193Provider } from "viem"
import { addMessageListener, connect, disconnect, init, request } from "./web3auth.sw"

/**
 * Web3Auth EIP1193 Provider. this proxies all requests to the shared worker
 * and all events from the shared worker, back to be emitted again here
 */
class Web3ProviderProxy extends SafeEventEmitter {
    async request({ method, params }: { method: string; params?: unknown[] }) {
        return await request({ method, params })
    }
}

export const web3EIP1193Provider = new Web3ProviderProxy() as EIP1193Provider

// forward events from provider
addMessageListener((n: unknown) => {
    if (!(n && typeof n === "object" && "action" in n)) {
        return
    }

    switch (n.action) {
        case "connect":
        case "disconnect":
        case "chainChanged":
        case "accountsChanged":
            ;(web3EIP1193Provider as Web3ProviderProxy).emit(n.action, "data" in n ? n.data : undefined)
            break
    }
})

export async function web3AuthInit() {
    await init()
}

export async function web3AuthConnect(jwt: JWTLoginParams) {
    return await connect(jwt)
}
export async function web3AuthDisconnect() {
    return await disconnect()
}
