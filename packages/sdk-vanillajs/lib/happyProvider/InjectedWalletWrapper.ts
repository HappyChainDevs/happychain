import {
    type EIP1193RequestMethods,
    type EIP1193RequestParameters,
    type EIP1193RequestResult,
    Msgs,
    type MsgsFromApp,
} from "@happychain/sdk-shared"
import { type EIP6963ProviderDetail, createStore } from "mipd"
import type { HappyProviderConfig } from "./interface"

const store = createStore()
/**
 * This InjectedWallet is an execution wrapper for local metamask accounts or other injected wallets
 * When a request is made from the dapp side, it will be sent to the iframe to be processed and run
 * through the middleware layers. finally when it actually comes down to executing onchain, it will
 * either be sent to web3auth, or it will be sent here to be executed by the users local wallet.
 * in either case, the request is executed, then returned back to the caller.
 *
 * the TLDR is this executes requests with metamask on the dapp, but can only be triggered
 * directly by the iframe, and will send all responses back to the iframe.
 */
export class InjectedWalletWrapper {
    public provider: EIP6963ProviderDetail["provider"] | undefined
    private info: EIP6963ProviderDetail["info"] | undefined

    constructor(protected config: HappyProviderConfig) {
        // This manages internal connection state, and tracks which injected wallet is connected
        config.msgBus.on(Msgs.InjectedWalletRequestConnect, this.handleProviderConnectionRequest.bind(this))

        // when iframe requests a new request to be executed, it is handled here
        config.providerBus.on(Msgs.ExecuteInjectedRequest, async (request) => {
            const resp = await this.executeRequest(request.payload)

            // the response is returned to the iframe
            config.providerBus.emit(Msgs.ExecuteInjectedResponse, {
                key: request.key,
                windowId: request.windowId,
                error: null,
                payload: resp,
            })
        })
    }

    /**
     * This will actually execute the request using the users chosen local EIP1193 provider
     *
     */
    private async executeRequest(args: EIP1193RequestParameters) {
        if (!this.provider) throw new Error("Failed to resolve local provider")

        try {
            const response: EIP1193RequestResult<EIP1193RequestMethods> = await this.provider.request(
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                args as any,
            )

            return response
        } catch (e) {
            console.log({ e })
        }
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

            console.log("connected")
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
