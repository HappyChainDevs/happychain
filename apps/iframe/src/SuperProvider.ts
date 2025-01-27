import { type UUID, createUUID } from "@happy.tech/common"
import {
    AuthState,
    BasePopupProvider,
    type EIP1193RequestParameters,
    Msgs,
    type ProviderEventPayload,
    WalletType,
    waitForCondition,
} from "@happy.tech/wallet-common"
import type { Client, EIP1193Provider } from "viem"
import { handle } from "./requests/experimental"
import { appForSourceID, iframeID } from "./requests/utils"
import { happyProviderBus } from "./services/eventBus"
import { getAuthState } from "./state/authState"
import { getInjectedClient } from "./state/injectedClient"
import { getPublicClient } from "./state/publicClient"
import { getUser } from "./state/user"
import { getWalletClient } from "./state/walletClient"
import { getAppURL, getIframeURL } from "./utils/appURL"
import { checkIfRequestRequiresConfirmation } from "./utils/checkIfRequestRequiresConfirmation"

export class SuperProvider extends BasePopupProvider implements EIP1193Provider {
    protected popupBaseUrl = getIframeURL()

    static #instance: SuperProvider

    static getInstance(): SuperProvider {
        SuperProvider.#instance ??= new SuperProvider()
        return SuperProvider.#instance
    }

    constructor() {
        super(iframeID())

        // listen to underlying provider and emit events when required
        // 'emit' events forwards events to
        // - dapp
        // -
        // event sources
        // - web3auth
        // - injected wallet
        // - our app

        // TODO: check window source for all requests

        // injected wallet
        happyProviderBus.on(Msgs.RequestInjected, this.handleInjectedRequest.bind(this))

        // social wallet confirmed/unconfirmed split
        happyProviderBus.on(Msgs.RequestPermissionless, this.handleUnconfirmed.bind(this))
        window.addEventListener("message", this.handlePopupResponse.bind(this))

        // handle permission checks
        happyProviderBus.on(Msgs.PermissionCheckRequest, this.handlePermissionCheck.bind(this))
    }

    // @ts-ignore
    async request({ method, params }) {
        // @notice: exposed for wagmi and internal use

        const req: ProviderEventPayload = {
            windowId: iframeID(),
            key: createUUID(),
            payload: { method, params },
            error: null,
        }

        const isInjected = getUser()?.type === WalletType.Injected
        if (isInjected) return await this.handleInjectedRequest(req)

        // handles popups, etc
        // @ts-ignore
        return await super.request(req.payload)
    }

    private handlePermissionCheck(data: ProviderEventPayload) {
        // TODO: fix argument type and won't need to cast here...
        const result = checkIfRequestRequiresConfirmation(getAppURL(), data.payload as EIP1193RequestParameters)
        const req = { key: data.key, windowId: data.windowId, error: null, payload: result }
        return happyProviderBus.emit(Msgs.PermissionCheckResponse, req)
    }

    private async handlePopupResponse(msg: MessageEvent) {
        // only trust same origin requests
        if (msg.origin !== window.location.origin) return
        if (msg.data.scope !== "server:popup") return

        switch (msg.data.type) {
            case Msgs.PopupApprove: {
                return await this.handleConfirmed(msg.data.payload).then(() => {
                    // close popup
                    msg.source?.postMessage("request-close")
                })
            }
            case Msgs.PopupReject: {
                // we can just reject directly here, no middleware needed
                // handleRejectedRequest(msg.data.payload)
                return
            }
        }
    }

    private async handleInjectedRequest(req: ProviderEventPayload) {
        const client = getInjectedClient()
        if (!client) throw new Error("Failed to connect injected client")
        this.handleRequest(req, false, client)
    }

    private async handleUnconfirmed(request: ProviderEventPayload) {
        const response = await this.handleRequest(request, false, getPublicClient())
        void happyProviderBus.emit(Msgs.RequestResponse, {
            key: request.key,
            windowId: request.windowId,
            error: null,
            // @ts-ignore
            payload: response ?? undefined,
        })

        return response
    }

    private async handleConfirmed(request: ProviderEventPayload) {
        const client = getWalletClient()
        if (!client) throw new Error("Failed to connect wallet client")
        // @ts-ignore
        const response = await this.handleRequest(request, true, client)
        void happyProviderBus.emit(Msgs.RequestResponse, {
            key: request.key,
            windowId: request.windowId,
            error: null,
            // @ts-ignore
            payload: response ?? undefined,
        })

        return response
    }

    private async handleRequest(req: ProviderEventPayload, userConfirmed: boolean, client: Client) {
        // run through middleware
        return await handle({
            // @ts-ignore
            payload: req.payload,
            confirmed: userConfirmed,
            client: client,
            source: appForSourceID(req.windowId)!,
        })
    }

    //===============================================

    protected override async requiresUserApproval(args: EIP1193RequestParameters): Promise<boolean> {
        // We're logging in or out, wait for the auth state to settle.
        await waitForCondition(() => getAuthState() !== AuthState.Initializing)

        // injected wallets don't need permissions here (handled by the wallet)
        if (this.isInjectedUser) return false

        return checkIfRequestRequiresConfirmation(getIframeURL(), args)
    }

    private get isInjectedUser() {
        return getUser()?.type === WalletType.Injected
    }

    protected override handlePermissionless(key: UUID, args: EIP1193RequestParameters): undefined {
        const req = { key, windowId: iframeID(), error: null, payload: args }
        // TODO: this needs to return?
        if (this.isInjectedUser) {
            this.handleInjectedRequest(req)
        } else {
            this.handleUnconfirmed(req)
        }
    }

    protected override async requestExtraPermissions(_args: EIP1193RequestParameters): Promise<boolean> {
        // The iframe is auto-connected by default, there is never a need for extra permissions.
        return true
    }
}
