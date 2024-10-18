import SafeEventEmitter from "@metamask/safe-event-emitter"
import { addMessageListener, request } from "../workers/web3auth.sw"

/**
 * Web3Auth EIP1193 Provider. this proxies all requests to the shared worker
 * and all events from the shared worker, back to be emitted again here
 */
export class Web3ProviderProxy extends SafeEventEmitter {
    constructor() {
        super()
        this.proxyEvents()
    }

    async request({ method, params }: { method: string; params?: unknown[] }) {
        // this forwards to the web3auth.sw request function, not recursive :)
        return await request({ method, params })
    }

    private proxyEvents() {
        addMessageListener((n: unknown) => {
            if (!(n && typeof n === "object" && "action" in n)) return

            switch (n.action) {
                case "connect":
                case "disconnect":
                case "chainChanged":
                case "accountsChanged":
                    this.emit(n.action, "data" in n ? n.data : undefined)
                    break
            }
        })
    }
}
