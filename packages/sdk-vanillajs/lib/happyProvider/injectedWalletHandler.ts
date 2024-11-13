import type { UUID } from "@happychain/common"
import { BasePopupProvider, type EIP1193RequestParameters, Msgs } from "@happychain/sdk-shared"
import { InjectedWalletWrapper } from "./InjectedWalletWrapper"
import type { EIP1193ConnectionHandler, HappyProviderConfig } from "./interface"

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
export class InjectedWalletHandler extends BasePopupProvider implements EIP1193ConnectionHandler {
    protected popupBaseUrl = ""
    private wrapper: InjectedWalletWrapper

    constructor(protected config: HappyProviderConfig) {
        super(config.windowId)
        // local connection (injected wallet)
        this.wrapper = new InjectedWalletWrapper(config)

        // TODO: Msgs.InjectedResponse
        config.providerBus.on(Msgs.RequestResponse, this.handleRequestResolution.bind(this))
    }

    isConnected(): boolean {
        console.log({ connected: Boolean(this.wrapper.provider) })
        return Boolean(this.wrapper.provider)
    }

    protected handlePermissionless(key: UUID, args: EIP1193RequestParameters): undefined {
        // Note that this always works regardless of log in or connection status.
        void this.config.providerBus.emit(Msgs.RequestInjected, {
            key,
            windowId: this.config.windowId,
            error: null,
            payload: args,
        })
    }

    protected override async requiresUserApproval(_args: EIP1193RequestParameters): Promise<boolean> {
        // checks will be handled by metamask if needed
        // this isn't exactly true though, since this means all requests will get processed
        // by 'permissionless' middleware path, which may be unexpected
        // TODO: check that this makes sense, it likely does not
        // i.e. it will miss an excellent entry into permissions mirroring
        // and it will not track watched assets and the like
        // for testing simple things it should be ok though, no regression
        // from previous behaviour
        return false
    }

    protected override async requestExtraPermissions(_args: EIP1193RequestParameters): Promise<boolean> {
        // complex permission edge cases are handled in social wallet handler
        return true
    }

    // public async request<TString extends EIP1193RequestMethods = EIP1193RequestMethods>(
    //     args: EIP1193RequestParameters<TString>,
    // ): Promise<EIP1193RequestResult<TString>> {
    //     if (!this.isConnected()) {
    //         throw new Error("Can not make request through local connection")
    //     }

    // TODO:
    // send to iframe, same as social wallet
    // return results here, same as social wallet

    // if (requestPayloadIsHappyMethod(args)) {
    //     throw new Error("Injected providers can't yet make 'happy_' requests")
    // }

    // if (isPermissionsRequest(args)) {
    //     void this.config.msgBus.emit(Msgs.MirrorPermissions, {
    //         request: args,
    //         response,
    //         rdns: this.localConnection.info.rdns,
    //     })
    // }

    // return response
    // }

    /** Injected Wallet Handlers */
    // private async handleProviderDisconnectionRequest() {
    //     this.removeListeners()
    //     void this.config.msgBus.emit(Msgs.InjectedWalletConnected, { rdns: undefined, address: undefined })
    // }

    // private async handleProviderConnectionRequest({
    //     rdns,
    //     request,
    // }: { rdns?: string; request: MsgsFromApp[Msgs.ConnectRequest] }) {
    //     if (!rdns) {
    //         // provider not specified, disconnect
    //         return this.handleProviderDisconnectionRequest()
    //     }
    //     try {
    //         const providerDetails = store.findProvider({ rdns })
    //         if (!providerDetails) {
    //             // cant find extension, disconnect
    //             return this.handleProviderDisconnectionRequest()
    //         }

    //         // cleanup any existing listeners from other connections
    //         this.removeListeners()

    //         const response = await providerDetails.provider.request(request.payload)
    //         const [address] =
    //             request.payload.method === "eth_requestAccounts"
    //                 ? (response as `0x${string}`[])
    //                 : await providerDetails.provider.request({ method: "eth_accounts" })

    //         this.setupLocalConnection(providerDetails)

    //         void this.config.msgBus.emit(Msgs.InjectedWalletConnected, { rdns, address, request, response })
    //     } catch {
    //         // Reached if eth_requestAccounts fails, meaning the user declined to give permission.
    //         // We just clear the existing provider in that case.
    //         void this.handleProviderDisconnectionRequest()
    //     }
    // }

    // private onAccountsChange(accounts: `0x${string}`[]) {
    //     this.emit("accountsChanged", accounts)
    //     if (!accounts.length) return this.handleProviderDisconnectionRequest()
    // }
    // private onChainChanged(chainId: string) {
    //     this.emit("chainChanged", chainId)
    // }
    // private onConnect(connectInfo: ProviderConnectInfo) {
    //     this.emit("connect", connectInfo)
    // }
    // private onDisconnect(error: ProviderRpcError) {
    //     this.emit("disconnect", error)
    // }
    // private onMessage(message: ProviderMessage) {
    //     this.emit("message", message)
    // }

    // private setupLocalConnection(providerDetails: EIP6963ProviderDetail) {
    //     this.localConnection = providerDetails

    //     // setup event proxying to base eip1193 provider
    //     providerDetails.provider.on("accountsChanged", this.onAccountsChange.bind(this))
    //     providerDetails.provider.on("chainChanged", this.onChainChanged.bind(this))
    //     providerDetails.provider.on("connect", this.onConnect.bind(this))
    //     providerDetails.provider.on("disconnect", this.onDisconnect.bind(this))
    //     providerDetails.provider.on("message", this.onMessage.bind(this))
    // }

    // private removeListeners() {
    //     this.localConnection?.provider.removeListener("accountsChanged", this.onAccountsChange.bind(this))
    //     this.localConnection?.provider.removeListener("chainChanged", this.onChainChanged.bind(this))
    //     this.localConnection?.provider.removeListener("connect", this.onConnect.bind(this))
    //     this.localConnection?.provider.removeListener("disconnect", this.onDisconnect.bind(this))
    //     this.localConnection?.provider.removeListener("message", this.onMessage.bind(this))
    // }
}
