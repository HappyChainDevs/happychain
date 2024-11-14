import {
    type EIP1193RequestMethods,
    type EIP1193RequestParameters,
    type EIP1193RequestResult,
    Msgs,
    type MsgsFromApp,
    getEIP1193ErrorObjectFromUnknown,
} from "@happychain/sdk-shared"
import { type EIP6963ProviderDetail, createStore } from "mipd"
import type { HappyProviderConfig } from "./interface"

const store = createStore()

/**
 * A wrapper for executing wallet operations through browser-injected providers like Metamask.
 * It acts as a bridge between the iframe and app contexts for wallet interactions. Its to be
 * initiated once by the happyProvider in injectedWalletHandler, but is never interacted with
 * directly from the app side.
 *
 * Request flow for app-initiated requests with injected wallet:
 * - App initiates request
 * - Request is forwarded to iframe for middleware processing
 * - Final execution occurs through this wrapper
 * - Response is returned to iframe, then to original caller
 *
 * Request flow for wallet-initiated requests with injected wallet:
 * - Wallet initiates request
 * - Request is passed through middleware processing
 * - Final execution occurs through this wrapper
 * - Response is returned to iframe, then to original caller
 */
export class InjectedWalletWrapper {
    public provider: EIP6963ProviderDetail["provider"] | undefined
    private info: EIP6963ProviderDetail["info"] | undefined

    constructor(protected config: HappyProviderConfig) {
        // This manages internal connection state, and tracks which injected wallet is connected
        config.msgBus.on(Msgs.InjectedWalletRequestConnect, this.handleProviderConnectionRequest.bind(this))

        // when iframe requests a new request to be executed, it is handled here
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
     * This will actually execute the request using the users chosen local EIP1193 provider
     *
     */
    private async executeRequest(args: EIP1193RequestParameters) {
        if (!this.provider) throw new Error("Failed to resolve local provider")

        const response: EIP1193RequestResult<EIP1193RequestMethods> = await this.provider.request(
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            args as any,
        )

        return response
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
            const providerDetails = store.findProvider({ rdns })
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
        this.provider = undefined
        this.info = undefined
    }
}
