import {
    type EIP1193RequestMethods,
    type EIP1193RequestParameters,
    type EIP1193RequestResult,
    Msgs,
    type MsgsFromApp,
    isPermissionsRequest,
} from "@happychain/sdk-shared"
import { requestPayloadIsHappyMethod } from "@happychain/sdk-shared"
import SafeEventEmitter from "@metamask/safe-event-emitter"
import { createStore } from "mipd"
import type { ProviderConnectInfo, ProviderMessage, ProviderRpcError } from "viem"
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
        config.msgBus.on(Msgs.InjectedWalletRequestConnect, this.handleProviderConnectionRequest.bind(this))
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

        if (requestPayloadIsHappyMethod(args)) {
            throw new Error("Injected providers can't yet make happy_ requests")
        }

        const response: EIP1193RequestResult<TString> = await this.localConnection.provider.request(args)

        if (isPermissionsRequest(args)) {
            this.proxyPermissions({ request: args, response })
        }

        return response
    }

    private proxyPermissions(params: MsgsFromApp[Msgs.MirrorPermissions]) {
        void this.config.msgBus.emit(Msgs.MirrorPermissions, params)
    }

    /** Injected Wallet Handlers */
    private async handleProviderDisconnectionRequest() {
        void this.config.msgBus.emit(Msgs.InjectedWalletConnected, { rdns: undefined, address: undefined })
        this.localConnection = undefined
    }

    private async handleProviderConnectionRequest({ rdns }: { rdns?: string }) {
        if (!rdns) {
            return this.handleProviderDisconnectionRequest()
        }
        try {
            const providerDetails = store.findProvider({ rdns })
            if (!providerDetails) {
                return this.handleProviderDisconnectionRequest()
            }

            providerDetails.provider.on("accountsChanged", (accounts: `0x${string}`[]) => {
                this.emit("accountsChanged", accounts)
                if (!accounts.length) {
                    return this.handleProviderDisconnectionRequest()
                }
                const [address] = accounts

                this.config.msgBus.emit(Msgs.InjectedWalletConnected, { rdns, address })
            })
            providerDetails.provider.on("chainChanged", (chainId: string) => this.emit("chainChanged", chainId))
            providerDetails.provider.on("connect", (connectInfo: ProviderConnectInfo) =>
                this.emit("connect", connectInfo),
            )
            providerDetails.provider.on("disconnect", (error: ProviderRpcError) => this.emit("disconnect", error))
            providerDetails.provider.on("message", (message: ProviderMessage) => this.emit("message", message))

            const [address] = await providerDetails.provider.request({ method: "eth_requestAccounts" })

            this.localConnection = providerDetails

            void this.config.msgBus.emit(Msgs.InjectedWalletConnected, { rdns, address })
        } catch {
            // Reached if eth_requestAccounts fails, meaning the user declined to give permission.
            // We just clear the existing provider in that case.
            void this.handleProviderDisconnectionRequest()
        }
    }
}
