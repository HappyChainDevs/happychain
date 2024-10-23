import SafeEventEmitter from "@metamask/safe-event-emitter"
import type { JWTLoginParams } from "@web3auth/mpc-core-kit"
import type { EIP1193Provider } from "viem"

import { addMessageListener, connect, disconnect, init, request } from "../workers/web3auth.sw"

/**
 * Web3Auth EIP1193 Provider. this proxies all requests to the shared worker
 * and all events from the shared worker, back to be emitted again here
 */
class Web3AuthProviderProxy extends SafeEventEmitter {
    async request({ method, params }: { method: string; params?: unknown[] }) {
        // web3auth.sw request function, not recursive :)
        return await request({ method, params })
    }
}

export const web3AuthEIP1193Provider = new Web3AuthProviderProxy() as EIP1193Provider & Web3AuthProviderProxy

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
            web3AuthEIP1193Provider.emit(n.action, "data" in n ? n.data : undefined)
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
