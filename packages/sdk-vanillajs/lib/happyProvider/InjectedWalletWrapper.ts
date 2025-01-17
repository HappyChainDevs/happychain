import { createUUID, injectedProviderInfo } from "@happychain/common"
import {
    type EIP1193RequestMethods,
    type EIP1193RequestParameters,
    type EIP1193RequestResult,
    Msgs,
    type MsgsFromApp,
    getEIP1193ErrorObjectFromUnknown,
} from "@happychain/sdk-shared"
import { type EIP6963ProviderDetail, createStore } from "mipd"
import type { ProviderConnectInfo, ProviderMessage, ProviderRpcError } from "viem"
import type { HappyProviderConfig } from "./interface"

const store = createStore()

/**
 * Small wrapper over mipd's `store.findProvider` to handle the special case of replacing
 * `wallet.injected` with `window.ethereum` as the provider
 */
function findProvider(rdns: string) {
    if (rdns === injectedProviderInfo.rdns && "ethereum" in window) {
        return { provider: window.ethereum, info: injectedProviderInfo } as EIP6963ProviderDetail
    }

    return store.findProvider({ rdns })
}

/**
 * A wrapper for executing wallet operations through browser-injected providers like Metamask.
 * It acts as a bridge between the iframe and app contexts for wallet interactions. It is to be
 * initiated once by the happyProvider in injectedWalletHandler, but is never interacted with
 * directly from the app side, only servicing messages sent by the iframe.
 *
 * Request flow for app-initiated requests with injected wallet:
 * - App initiates request
 * - Request is forwarded to iframe for middleware processing
 * - Iframe potentially returns a request to this wrapper, to be forwarded to the injected wallet
 * - In that case, the injected wallet's response is returned to the iframe
 * - The iframe returns this answer back to the original caller on the app side
 *
 * Request flow for wallet-initiated (iframe side) requests with injected wallet:
 * - Wallet initiates request
 * - Request is passed through middleware processing
 * - Iframe potentially send a request to this wrapper, to be forwarded to the injected wallet
 * - In that case, the injected wallet's response is returned to the iframe
 */
export class InjectedWalletWrapper {
    public provider: EIP6963ProviderDetail["provider"] | undefined
    public info: EIP6963ProviderDetail["info"] | undefined

    constructor(protected config: HappyProviderConfig) {
        // Called when the user tries to log in with an injected wallet.
        // This manages internal connection state, and tracks which injected wallet is connected.
        config.msgBus.on(Msgs.InjectedWalletRequestConnect, this.handleProviderConnectionRequest.bind(this))

        // When the iframe requests a new request to be executed, it is handled here.
        config.providerBus.on(Msgs.ExecuteInjectedRequest, async (request) => {
            try {
                const resp = await this.executeRequest(request.payload)

                // the response is returned to the iframe
                config.providerBus.emit(Msgs.ExecuteInjectedResponse, {
                    key: request.key,
                    windowId: request.windowId,
                    error: null,
                    payload: resp,
                })
            } catch (e) {
                config.providerBus.emit(Msgs.ExecuteInjectedResponse, {
                    key: request.key,
                    windowId: request.windowId,
                    error: getEIP1193ErrorObjectFromUnknown(e),
                    payload: null,
                })
            }
        })
    }

    /**
     * This will actually execute the request using the users chosen injected wallet EIP1193 provider.
     */
    private async executeRequest(args: EIP1193RequestParameters): Promise<EIP1193RequestResult<EIP1193RequestMethods>> {
        if (!this.provider) throw new Error("Failed to resolve local provider")
        // biome-ignore lint/suspicious/noExplicitAny: we support custom request types
        return await this.provider.request(args as any)
    }

    /**
     * User is connecting. Save which provider they connected with
     */
    private async handleProviderConnectionRequest({
        rdns,
        request,
    }: { rdns?: string; request: MsgsFromApp[Msgs.ConnectRequest] }) {
        if (!rdns) {
            // provider not specified, disconnect
            return this.handleProviderDisconnectionRequest()
        }
        try {
            const providerDetails = findProvider(rdns)

            if (!providerDetails) {
                // cant find extension, disconnect
                return this.handleProviderDisconnectionRequest()
            }

            const response = await providerDetails.provider.request(request.payload)
            const [address] =
                request.payload.method === "eth_requestAccounts"
                    ? (response as `0x${string}`[])
                    : await providerDetails.provider.request({ method: "eth_accounts" })

            this.info = providerDetails.info
            this.provider = providerDetails.provider

            void this.config.msgBus.emit(Msgs.InjectedWalletConnected, { rdns, address, request, response })
            this.addProviderListeners()
        } catch {
            // Reached if eth_requestAccounts fails, meaning the user declined to give permission.
            // We just clear the existing provider in that case.
            void this.handleProviderDisconnectionRequest()
        }
    }

    /**
     * User is disconnected. Clear previously used providers
     */
    private async handleProviderDisconnectionRequest() {
        this.removeProviderListeners()
        this.provider = undefined
        this.info = undefined
    }

    private forwardEvent(event: string, params: unknown) {
        void this.config.providerBus.emit(Msgs.ForwardInjectedEvent, {
            key: createUUID(),
            windowId: this.config.windowId,
            error: null,
            payload: {
                event: event,
                params: params,
            },
        })
    }

    private onAccountsChange(accounts: `0x${string}`[]) {
        this.forwardEvent("accountsChanged", accounts)
    }

    private onChainChanged(chainId: string) {
        this.forwardEvent("chainChanged", chainId)
    }

    private onConnect(connectInfo: ProviderConnectInfo) {
        this.forwardEvent("connect", connectInfo)
    }

    private onDisconnect(error: ProviderRpcError) {
        this.forwardEvent("disconnect", error)
    }

    private onMessage(message: ProviderMessage) {
        this.forwardEvent("message", message)
    }

    private addProviderListeners() {
        // setup event proxying to base eip1193 provider
        this.provider?.on("accountsChanged", this.onAccountsChange.bind(this))
        this.provider?.on("chainChanged", this.onChainChanged.bind(this))
        this.provider?.on("connect", this.onConnect.bind(this))
        this.provider?.on("disconnect", this.onDisconnect.bind(this))
        this.provider?.on("message", this.onMessage.bind(this))
    }

    private removeProviderListeners() {
        this.provider?.removeListener("accountsChanged", this.onAccountsChange.bind(this))
        this.provider?.removeListener("chainChanged", this.onChainChanged.bind(this))
        this.provider?.removeListener("connect", this.onConnect.bind(this))
        this.provider?.removeListener("disconnect", this.onDisconnect.bind(this))
        this.provider?.removeListener("message", this.onMessage.bind(this))
    }
}
