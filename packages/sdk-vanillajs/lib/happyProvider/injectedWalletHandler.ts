import {
    type EIP1193RequestMethods,
    type EIP1193RequestParameters,
    type EIP1193RequestResult,
    Msgs,
    type MsgsFromApp,
    SafeEventEmitter,
    isPermissionsRequest,
} from "@happychain/sdk-shared"
import { requestPayloadIsHappyMethod } from "@happychain/sdk-shared"
import { type EIP6963ProviderDetail, createStore } from "mipd"
import type { ProviderConnectInfo, ProviderMessage, ProviderRpcError } from "viem"
import type { EIP1193ConnectionHandler, HappyProviderConfig } from "./interface"

const store = createStore()

/**
 * `InjectedWalletHandler` listens to connection requests from the iframe.
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
    private localConnection: EIP6963ProviderDetail | undefined

    constructor(protected config: HappyProviderConfig) {
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
            throw new Error("Injected providers can't yet make 'happy_' requests")
        }

        const response: EIP1193RequestResult<TString> = await this.localConnection.provider.request(args)

        if (isPermissionsRequest(args)) {
            void this.config.msgBus.emit(Msgs.MirrorPermissions, {
                request: args,
                response,
                rdns: this.localConnection.info.rdns,
            })
        }

        return response
    }

    /** Injected Wallet Handlers */
    private async handleProviderDisconnectionRequest() {
        this.removeListeners()
        void this.config.msgBus.emit(Msgs.InjectedWalletConnected, { rdns: undefined, address: undefined })
    }

    private async handleProviderConnectionRequest({
        rdns,
        request,
    }: { rdns?: string; request: MsgsFromApp[Msgs.ConnectRequest] }) {
        if (!rdns) {
            // provider not specified, disconnect
            return this.handleProviderDisconnectionRequest()
        }
        try {
            const providerDetails = store.findProvider({ rdns })
            if (!providerDetails) {
                // cant find extension, disconnect
                return this.handleProviderDisconnectionRequest()
            }

            // cleanup any existing listeners from other connections
            this.removeListeners()

            const response = await providerDetails.provider.request(request.payload)
            const [address] =
                request.payload.method === "eth_requestAccounts"
                    ? (response as `0x${string}`[])
                    : await providerDetails.provider.request({ method: "eth_accounts" })

            this.setupLocalConnection(providerDetails)

            void this.config.msgBus.emit(Msgs.InjectedWalletConnected, { rdns, address, request, response })
        } catch {
            // Reached if eth_requestAccounts fails, meaning the user declined to give permission.
            // We just clear the existing provider in that case.
            void this.handleProviderDisconnectionRequest()
        }
    }

    private onAccountsChange(accounts: `0x${string}`[]) {
        this.emit("accountsChanged", accounts)
        if (!accounts.length) return this.handleProviderDisconnectionRequest()
    }
    private onChainChanged(chainId: string) {
        this.emit("chainChanged", chainId)
    }
    private onConnect(connectInfo: ProviderConnectInfo) {
        this.emit("connect", connectInfo)
    }
    private onDisconnect(error: ProviderRpcError) {
        this.emit("disconnect", error)
    }
    private onMessage(message: ProviderMessage) {
        this.emit("message", message)
    }

    private setupLocalConnection(providerDetails: EIP6963ProviderDetail) {
        this.localConnection = providerDetails

        // setup event proxying to base eip1193 provider
        providerDetails.provider.on("accountsChanged", this.onAccountsChange.bind(this))
        providerDetails.provider.on("chainChanged", this.onChainChanged.bind(this))
        providerDetails.provider.on("connect", this.onConnect.bind(this))
        providerDetails.provider.on("disconnect", this.onDisconnect.bind(this))
        providerDetails.provider.on("message", this.onMessage.bind(this))
    }

    private removeListeners() {
        this.localConnection?.provider.removeListener("accountsChanged", this.onAccountsChange.bind(this))
        this.localConnection?.provider.removeListener("chainChanged", this.onChainChanged.bind(this))
        this.localConnection?.provider.removeListener("connect", this.onConnect.bind(this))
        this.localConnection?.provider.removeListener("disconnect", this.onDisconnect.bind(this))
        this.localConnection?.provider.removeListener("message", this.onMessage.bind(this))
    }
}
