import { type UUID, createUUID } from "../common-utils"

import {
    AuthState,
    BasePopupProvider,
    type EIP1193RequestParameters,
    EIP1193UserRejectedRequestError,
    type HappyUser,
    type InFlightRequest,
    Msgs,
    type ProviderMsgsFromIframe,
    type ResolveType,
} from "@happychain/sdk-shared"
import { ModalStates } from "@happychain/sdk-shared"
import type { HappyProviderConfig } from "./interface"

type InFlightCheck = {
    resolve: (value: boolean) => void
    reject: (reason?: unknown) => void
}

const POPUP_FEATURES = ["width=400", "height=800", "popup=true", "toolbar=0", "menubar=0"].join(",")

/**
 * SocialWalletHandler handles proxying EIP-1193 requests
 * to the iframe where it is handled by either the connected
 * social provider if the user is connected, or a public rpc
 * if there is no user connected. For requests that require explicit
 * user approval/confirmation these requests are sent to a popup window
 * where the user can approve/reject the requests before they are sent
 * to the iframe to be handled
 */
export class SocialWalletHandler extends BasePopupProvider {
    private inFlightChecks = new Map<string, InFlightCheck>()

    private user: HappyUser | undefined
    private authState: AuthState = AuthState.Connecting

    constructor(private config: HappyProviderConfig) {
        super()
        // sync local user state
        config.msgBus.on(Msgs.UserChanged, (_user) => {
            this.user = _user
        })

        config.msgBus.on(Msgs.AuthStateChanged, (_authState) => {
            this.authState = _authState
        })

        config.providerBus.on(Msgs.ProviderEvent, this.handleProviderNativeEvent.bind(this))

        // Social Auth (Iframe Proxy)
        config.providerBus.on(Msgs.RequestResponse, this.handleRequestResolution.bind(this))

        config.providerBus.on(Msgs.PermissionCheckResponse, this.handlePermissionCheck.bind(this))
    }

    protected override async requiresUserApproval(
        args: EIP1193RequestParameters,
        key: UUID,
    ): Promise<boolean | unknown> {
        return new Promise((resolve, reject) => {
            this.config.providerBus.emit(Msgs.PermissionCheckRequest, {
                key,
                windowId: this.config.windowId,
                payload: args,
                error: null,
            })

            this.inFlightChecks.set(key, { resolve, reject })
        })
    }

    protected handlePermissionless(
        key: UUID,
        args: EIP1193RequestParameters,
        { resolve, reject }: InFlightRequest,
    ): void {
        this.autoApprove(key, args)
        this.trackRequest(key, { resolve: resolve as ResolveType, reject })
        return
    }

    protected override async requestPermissions(
        key: UUID,
        args: EIP1193RequestParameters,
        { resolve, reject }: InFlightRequest,
    ): Promise<boolean | unknown> {
        /**
         * If the user is not connected (and not logged in)
         * Display the login screen. If/when the login is successful,
         * run the initial protected request. If the original request
         * was explicit permissions request, then it was granted automatically
         * as part of the login flow, so we can auto-approve here and the response
         * will be what is returned to the originating caller
         */
        if (!this.user && this.authState === AuthState.Disconnected) {
            void this.config.msgBus.emit(Msgs.RequestDisplay, ModalStates.Login)

            const unsubscribeClose = this.config.msgBus.on(Msgs.ModalToggle, (state) => {
                if (state.isOpen) return
                unsubscribeClose()
                if (state.cancelled) {
                    unsubscribeSuccess()
                    this.inFlightChecks.delete(key)
                    reject(new EIP1193UserRejectedRequestError())
                }
            })

            const unsubscribeSuccess = this.config.msgBus.on(Msgs.UserChanged, (user) => {
                if (user) {
                    // auto-approve only works for these methods, since this is a direct response
                    // the user login flow, and upon user login, these permissions get granted automatically

                    ;["eth_requestAccounts", "wallet_requestPermissions"].includes(args.method)
                        ? this.autoApprove(key, args)
                        : this.promptUser(key, args)

                    // process request when user is logged in successfully
                    this.trackRequest(key, { resolve: resolve as ResolveType, reject })
                    unsubscribeSuccess()
                    unsubscribeClose()
                }
            })
            return
        }

        /**
         * If the user is Logged In, but not connected to the dapp,
         * and is making a protected request _other than_ explicitly requesting
         * a connection, then intercept with a connection request, and only proceed
         * if the permissions are granted
         */
        if (
            !this.user &&
            this.authState === AuthState.Connected &&
            !["eth_requestAccounts", "wallet_requestPermissions"].includes(args.method)
        ) {
            // request wallet permissions on the dapps behalf, then run dapps request
            await this.request({
                method: "wallet_requestPermissions",
                params: [{ eth_accounts: {} }],
            })
        }
    }

    isConnected(): boolean {
        // this is the fallback handler, always marked as 'connected' for public RPC's etc
        return true
    }

    private async handlePermissionCheck(data: ProviderMsgsFromIframe[Msgs.PermissionCheckResponse]) {
        const inFlight = this.inFlightChecks.get(data.key)
        if (!inFlight) return
        if (typeof data.payload === "boolean") {
            inFlight.resolve(data.payload)
        } else {
            inFlight.reject(data.error)
        }
        this.inFlightChecks.delete(data.key)
    }

    private async requiresApproval(args: EIP1193RequestParameters) {
        const key = createUUID()
        return new Promise((resolve, reject) => {
            this.config.providerBus.emit(Msgs.PermissionCheckRequest, {
                key,
                windowId: this.config.windowId,
                payload: args,
                error: null,
            })

            this.inFlightChecks.set(key, { resolve, reject })
        })
    }

    private handleProviderNativeEvent(data: ProviderMsgsFromIframe[Msgs.ProviderEvent]) {
        this.emit(data.payload.event, data.payload.args)
    }

    private autoApprove(key: UUID, args: EIP1193RequestParameters) {
        void this.config.providerBus.emit(Msgs.RequestPermissionless, {
            key,
            windowId: this.config.windowId,
            error: null,
            payload: args,
        })

        return null
    }

    private promptUser(key: UUID, args: EIP1193RequestParameters) {
        const url = new URL("request", this.config.iframePath)
        const opts = {
            windowId: this.config.windowId,
            key: key,
            args: btoa(JSON.stringify(args)),
        }

        const searchParams = new URLSearchParams(opts).toString()
        return window.open(`${url}?${searchParams}`, "_blank", POPUP_FEATURES)
    }

    protected async performOptionalUserAndAuthCheck(): Promise<unknown> {
        return null
    }
}
