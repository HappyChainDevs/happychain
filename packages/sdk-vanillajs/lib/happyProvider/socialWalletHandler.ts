import {
    AuthState,
    BasePopupProvider,
    type EIP1193RequestMethods,
    type EIP1193RequestParameters,
    type EIP1193RequestResult,
    EIP1193UserRejectedRequestError,
    GenericProviderRpcError,
    type HappyUser,
    Msgs,
    type PopupMsgsFromIframe,
    type ResolveType,
} from "@happychain/sdk-shared"
import { ModalStates } from "@happychain/sdk-shared/lib/interfaces/events"
import type { UUID } from "../common-utils"
import type { HappyProviderConfig } from "./interface"

type InFlightCheck = {
    resolve: (value: boolean) => void
    reject: (reason?: unknown) => void
}

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

    constructor(protected config: HappyProviderConfig) {
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
        config.providerBus.on(Msgs.RequestResponse, this.handleCompletedRequest.bind(this))

        config.providerBus.on(Msgs.PermissionCheckResponse, this.handlePermissionCheck.bind(this))
    }

    public override async request<TString extends EIP1193RequestMethods = EIP1193RequestMethods>(
        args: EIP1193RequestParameters<TString>,
    ): Promise<EIP1193RequestResult<TString>> {
        // Every request gets proxied through this function.
        // If it is eth_call or a non-tx non-signature request, we can auto-approve
        // by posting the request args using request:approve,
        // otherwise we open the popup and pass the request args through the hash URL.
        const key = this.generateKey()

        // biome-ignore lint/suspicious/noAsyncPromiseExecutor: we need this to resolve elsewhere
        return new Promise(async (resolve, reject) => {
            const requiresUserApproval = await this.requiresUserApproval(args)

            if (!requiresUserApproval) {
                const popup = this.autoApprove(key, args)
                this.queueRequest(key, { resolve: resolve as ResolveType, reject, popup })
                return
            }

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
                        // the the user login flow, and upon user login, these permissions get granted automatically
                        const popup = ["eth_requestAccounts", "wallet_requestPermissions"].includes(args.method)
                            ? this.autoApprove(key, args)
                            : this.openPopupAndAwaitResponse(key, args, this.config.windowId, this.config.iframePath)

                        // process request when user is logged in successfully
                        this.queueRequest(key, { resolve, reject, popup })
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

            const popup = this.openPopupAndAwaitResponse(key, args, this.config.windowId, this.config.iframePath)
            this.queueRequest(key, { resolve: resolve as ResolveType, reject, popup })
        })
    }

    override isConnected(): boolean {
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

    protected async requiresUserApproval(args: EIP1193RequestParameters) {
        const key = this.generateKey()
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

    private handleCompletedRequest(data: ProviderMsgsFromIframe[Msgs.RequestResponse]) {
        const req = this.inFlightRequests.get(data.key)

        if (!req) {
            return { resolve: null, reject: null }
        }

        const { resolve, reject, popup } = req
        this.inFlightRequests.delete(data.key)
        popup?.close()

        if (reject && data.error) {
            reject(
                new GenericProviderRpcError({
                    code: data.error.code,
                    message: data.error.message,
                    data: data.error.data,
                }),
            )
        } else if (resolve) {
            resolve(data.payload)
        } else {
            // no key associated, perhaps from another tab context?
        }
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

    openPopupAndAwaitResponse(key: UUID, args: EIP1193RequestParameters) {
        const url = new URL("request", this.config.iframePath)
        const opts = {
            windowId: this.config.windowId,
            key: key,
            args: btoa(JSON.stringify(args)),
        }

        const searchParams = new URLSearchParams(opts).toString()
        return window.open(`${url}?${searchParams}`, "_blank", SocialWalletHandler.POPUP_FEATURES)
    }
}
