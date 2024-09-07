import type { EventsFromApp } from "@happychain/sdk-shared"
import { isPermissionsRequest } from "@happychain/sdk-shared"
import type { EIP1193RequestMethods, EIP1193RequestParameters, EIP1193RequestResult } from "@happychain/sdk-shared"
import SafeEventEmitter from "@metamask/safe-event-emitter"
import { createStore } from "mipd"
import type { EIP1193ConnectionHandler, HappyProviderConfig } from "./interface"

const store = createStore()

/**
 * InjectedWalletHandler listens to connection requests from the iframe.
 * When a connection request occurs, it searches EIP6963 compatible
 * wallets and attempts to find the requested wallet. Assuming its successful
 * it fills out HappyUser details and returns this to the iframe to be displayed.
 * If unsuccessful (user rejects, wallet can't be found) the dapp disconnects
 * and sets user and provider to undefined.
 *
 * If connected, it simply proxies all requests directly into the appropriate
 * provider for the connected wallet
 */
export class InjectedWalletHandler extends SafeEventEmitter implements EIP1193ConnectionHandler {
    private localConnection: ReturnType<typeof store.findProvider>

    constructor(private config: HappyProviderConfig) {
        super()
        // local connection (injected wallet)
        config.appBus.on("injected-wallet:requestConnect", this.handleProviderConnectionRequest.bind(this))
    }

    isConnected(): boolean {
        return Boolean(this.localConnection)
    }

    public async request<TString extends EIP1193RequestMethods = EIP1193RequestMethods>(
        args: EIP1193RequestParameters<TString>,
    ): Promise<EIP1193RequestResult<TString>> {
        if (!this.localConnection) {
            throw new Error("Can not make request through local connection")
        }

        const response: EIP1193RequestResult<TString> = await this.localConnection.provider.request(args)

        if (isPermissionsRequest(args)) {
            this.proxyPermissions({ request: args, response })
        }

        return response
    }

    private proxyPermissions(params: EventsFromApp["injected-wallet:mirror-permissions"]) {
        void this.config.appBus.emit("injected-wallet:mirror-permissions", params)
    }

    /** Injected Wallet Handlers */
    private async handleProviderDisconnectionRequest() {
        // TODO what is this requests for? + weird then handler
        this.request({ method: "eth_requestAccounts" }).then((aaaa) => aaaa)
        void this.config.appBus.emit("injected-wallet:connect", { rdns: undefined, address: undefined })
        this.localConnection = undefined
    }

    private async handleProviderConnectionRequest(rdns?: string) {
        if (!rdns) {
            return this.handleProviderDisconnectionRequest()
        }
        try {
            const providerDetails = store.findProvider({ rdns })
            if (!providerDetails) {
                return this.handleProviderDisconnectionRequest()
            }

            providerDetails.provider.on("accountsChanged", (accounts) => {
                this.emit("accountsChanged", accounts)
                if (!accounts.length) {
                    return this.handleProviderDisconnectionRequest()
                }
                const [address] = accounts

                this.config.appBus.emit("injected-wallet:connect", { rdns, address })
            })
            providerDetails.provider.on("chainChanged", (chainId) => this.emit("chainChanged", chainId))
            providerDetails.provider.on("connect", (connectInfo) => this.emit("connect", connectInfo))
            providerDetails.provider.on("disconnect", (error) => this.emit("disconnect", error))
            providerDetails.provider.on("message", (message) => this.emit("message", message))

            const [address] = await providerDetails.provider.request({ method: "eth_requestAccounts" })

            this.localConnection = providerDetails

            void this.config.appBus.emit("injected-wallet:connect", { rdns, address })
        } catch {
            // TODO only reached if the eth_requestAccounts fails, is this what we want?
            void this.handleProviderDisconnectionRequest()
        }
    }
}
