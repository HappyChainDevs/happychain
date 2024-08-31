import {
    AuthState,
    type EIP1193ProxiedEvents,
    type EIP1193RequestArg,
    type EventUUID,
    type HappyUser,
} from "@happychain/sdk-shared"
import { EIP1193UserRejectedRequestError, GenericProviderRpcError } from "@happychain/sdk-shared"
import SafeEventEmitter from "@metamask/safe-event-emitter"
import type { EIP1193RequestFn, EIP1474Methods } from "viem"

import type { EIP1193RequestParameters } from "@happychain/sdk-shared/lib/services/eip1193Provider/events"
import { waitForCondition } from "@happychain/sdk-shared/lib/utils/waitForCondition"
import type { EIP1193ConnectionHandler, HappyProviderConfig } from "./interface"

type Timer = ReturnType<typeof setInterval>

type InFlightRequest = {
    // biome-ignore lint/suspicious/noExplicitAny: difficult type, viem _returnType
    resolve: (value: any) => void
    reject: (reason?: unknown) => void
    popup: Window | null
}

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
export class SocialWalletHandler extends SafeEventEmitter implements EIP1193ConnectionHandler {
    private inFlightRequests = new Map<string, InFlightRequest>()
    private inFlightChecks = new Map<string, InFlightCheck>()
    private timer: Timer | null = null

    private user: HappyUser | undefined
    private authState: AuthState = AuthState.Connecting

    constructor(private config: HappyProviderConfig) {
        super()
        // sync local user state
        config.dappBus.on("auth-changed", (_user) => {
            this.user = _user
        })

        config.dappBus.on("auth-state", (_authState) => {
            this.authState = _authState
        })

        config.providerBus.on("provider:event", this.handleProviderNativeEvent.bind(this))

        // Social Auth (Iframe Proxy)
        config.providerBus.on("response:complete", this.handleCompletedRequest.bind(this))

        config.providerBus.on("permission-check:response", this.handlePermissionCheck.bind(this))
    }

    request: EIP1193RequestFn<EIP1474Methods> = async (_args) => {
        const args = _args as EIP1193RequestParameters

        // this shouldn't be needed here. the requiresApproval check should
        // wait if its needed...?
        if (this.authState === AuthState.Connecting) {
            // wait till either authenticated or unauthenticated
            await waitForCondition(() => this.authState !== AuthState.Connecting)
        }
        // Every request gets proxied through this function.
        // If it is eth_call or a non-tx non-signature request, we can auto-approve
        // by posting the request args using request:approve,
        // otherwise we open the popup and pass the request args through the hash URL.
        const key = crypto.randomUUID()

        // biome-ignore lint/suspicious/noAsyncPromiseExecutor: we need this to resolve elsewhere
        return new Promise(async (resolve, reject) => {
            const requiresUserApproval = await this.requiresApproval(args)

            if (!requiresUserApproval) {
                const popup = this.autoApprove(key, args)
                this.queueRequest(key, { resolve, reject, popup })
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
                this.config.dappBus.emit("request-display", "login-modal")

                const unsubscribe = this.config.dappBus.on("auth-changed", (user) => {
                    if (user) {
                        // auto-approve only works for these methods, since this is a direct response
                        // the the user login flow, and upon user login, these permissions get granted automatically
                        const popup = ["eth_requestAccounts", "wallet_requestPermissions"].includes(args.method)
                            ? this.autoApprove(key, args)
                            : this.promptUser(key, args)

                        // process request when user is logged in successfully
                        this.queueRequest(key, { resolve, reject, popup })
                        unsubscribe()
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

            const popup = this.promptUser(key, args)
            this.queueRequest(key, { resolve, reject, popup })
        })
    }

    isConnected(): boolean {
        // this is the fallback handler, always marked as 'connected' for public RPC's etc
        return true
    }

    private async handlePermissionCheck(data: EIP1193ProxiedEvents["permission-check:response"]) {
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
        const key = crypto.randomUUID()
        return new Promise((resolve, reject) => {
            this.config.providerBus.emit("permission-check:request", {
                key,
                windowId: this.config.windowId,
                payload: args,
                error: null,
            })

            this.inFlightChecks.set(key, { resolve, reject })
        })
    }

    private handleProviderNativeEvent(data: EIP1193ProxiedEvents["provider:event"]) {
        this.emit(data.payload.event, data.payload.args)
    }

    private handleCompletedRequest(data: EIP1193ProxiedEvents["response:complete"]) {
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

    private queueRequest(key: string, { resolve, reject, popup }: InFlightRequest) {
        this.inFlightRequests.set(key, { resolve, reject, popup })

        if (!this.timer && popup) {
            this.timer = setInterval(() => {
                let withPopups = 0
                for (const [k, req] of this.inFlightRequests) {
                    if (!req.popup) {
                        continue
                    }

                    if (req.popup.closed) {
                        // manually closed without explicit rejection
                        req.reject(new EIP1193UserRejectedRequestError())
                        this.inFlightRequests.delete(k)
                    } else {
                        // still open
                        withPopups++
                    }
                }

                if (this.timer && !withPopups) {
                    clearInterval(this.timer)
                    this.timer = null
                }
            }, 100) // every half second, check if popup has been manually closed
        }
    }

    private autoApprove(key: EventUUID, args: EIP1193RequestArg) {
        this.config.providerBus.emit("request:approve", {
            key,
            windowId: this.config.windowId,
            error: null,
            payload: args,
        })

        return null
    }

    private promptUser(key: EventUUID, args: EIP1193RequestArg) {
        const url = new URL("request", this.config.iframePath)
        const opts = {
            windowId: this.config.windowId,
            key: key,
            args: btoa(JSON.stringify(args)),
        }
        const searchParams = new URLSearchParams(opts).toString()
        return window.open(`${url}?${searchParams}`, "_blank", POPUP_FEATURES)
    }
}
