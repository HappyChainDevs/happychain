import { type UUID, createUUID } from "@happychain/common"
import SafeEventEmitter from "@metamask/safe-event-emitter"
import { config } from "../config"
import type {
    EIP1193ConnectionHandler,
    EIP1193RequestMethods,
    EIP1193RequestParameters,
    EIP1193RequestResult,
} from "../interfaces/eip1193"
import { EIP1193UserRejectedRequestError, GenericProviderRpcError } from "../interfaces/errors"
import type { Msgs, ProviderEvent, ProviderMsgsFromIframe } from "../interfaces/events"

type Timer = ReturnType<typeof setInterval>

export type InFlightRequest<T extends EIP1193RequestMethods = EIP1193RequestMethods> = {
    resolve: (value: EIP1193RequestResult<T>) => void
    reject: (reason?: unknown) => void
    popup?: Window
}

export type ResolveType<T extends EIP1193RequestMethods = EIP1193RequestMethods> = (
    value: EIP1193RequestResult<T>,
) => void

/**
 * This class serves as a base for EIP-1193 providers that sometimes need to create popups to
 * collect user approval. In particular, we have one such provider living on the app that relays
 * requests to the iframe, and one such provider living in the iframe which is for requests
 * initiated from within the iframe.
 *
 * Requests are made via the request method, which calls the requiresUserApproval method to
 * determine whether an approval popup is needed. If so, a popup is created. The user approval or
 * rejection is relayed by the popup to the iframe, which relays it to the provider in a way that
 * triggers the handleCompletedRequest method. If no approval method is needed, the
 * handlePermissionlessRequest method is called instead.
 *
 * The requestPermissions method is called to check if some permissions (beyond a simple user
 * approval) are required for the request to proceed (so far this only happens when the app tries to
 * make a request but isn't authenticated in the wallet or connected to it). The method should attempt
 * getting the permissions from the user (i.e. implement prompting) and then return
 * specifying whether the original request is be treated as permissionless or requires a further
 * approval.
 *
 * Note that requestPermissions is only called when requiresUserApproval returns true. That's
 * because we allow permissionless access to the iframe provider, but suggesting things to the user
 * (usually signing transactions) is subject to the initial wallet connection approval. Some
 * requests (wallet_requestPermissions) can be be either permissionless (if the permission has
 * already been granted) or require approval (if not), which is why this method needs to return a
 * value to indicate this.
 *
 * The class includes logic that checks if a popup was closed instead of giving an explicit approval
 * or rejection, which is then equated to a rejection.
 *
 * The class extends the {@link https://github.com/MetaMask/safe-event-emitter | SafeEventEmitter}
 * to enable emitting events on instances of this class without having to handle the errors that
 * can possibly be thrown by the handlers (these are thrown in a setTimeout instead).
 */
export abstract class BasePopupProvider extends SafeEventEmitter implements EIP1193ConnectionHandler {
    private inFlightRequests = new Map<string, InFlightRequest>()
    private timer: Timer | null = null
    private static readonly POPUP_FEATURES = //
        ["width=400", "height=800", "popup=true", "toolbar=0", "menubar=0"].join(",")

    public windowId = createUUID()

    /**
     * Sends an EIP-1193 request to the provider.
     */
    public async request<TString extends EIP1193RequestMethods = EIP1193RequestMethods>(
        args: EIP1193RequestParameters<TString>,
    ): Promise<EIP1193RequestResult<TString>> {
        const key = createUUID()

        await this.performOptionalUserAndAuthCheck()

        let resolve = null as unknown as ResolveType<TString>
        let reject = null as unknown as (reason?: unknown) => void
        const result = new Promise<EIP1193RequestResult<TString>>((_resolve, _reject) => {
            resolve = _resolve as unknown as ResolveType<TString>
            reject = _reject
        })

        const requiresApproval = (await this.requiresUserApproval(args)) && (await this.requestExtraPermissions(args))

        let popup: Window | undefined
        if (requiresApproval) {
            popup = this.openPopupAndAwaitResponse(key, args, this.windowId as UUID, config.iframePath)
        } else {
            this.handlePermissionless(key, args)
        }
        this.trackRequest(key, { resolve: resolve! as unknown as ResolveType, reject, popup })

        return result
    }

    /**
     * Starts a timer that periodically checks the status of popups related to in-flight requests.
     * If a popup is detected as closed, the corresponding request is rejected, and the request is removed
     * from the queue. The timer stops automatically when there are no more popups to track.
     */
    private startPopupCheckTimer(): void {
        if (this.timer) return

        const intervalMs = 100

        this.timer = setInterval(() => {
            let withPopups = 0
            for (const [k, req] of this.inFlightRequests) {
                if (!req.popup) continue

                if (req.popup.closed) {
                    req.reject(new EIP1193UserRejectedRequestError())
                    this.inFlightRequests.delete(k)
                } else {
                    withPopups++
                }
            }
            if (this.timer && !withPopups) {
                clearInterval(this.timer)
                this.timer = null
            }
        }, intervalMs)
    }

    /**
     * Adds a request to the queue of in-flight requests. The request is associated with a unique key
     * and will be tracked until it is either resolved or rejected. If the request involves a popup,
     * the popup is also tracked for closure.
     */
    private trackRequest(requestKey: UUID, { resolve, reject, popup }: InFlightRequest): void {
        this.inFlightRequests.set(requestKey, { resolve, reject, popup })
        if (popup) this.startPopupCheckTimer()
    }

    /**
     * Opens a popup window for the user request approval process.
     */
    private openPopupAndAwaitResponse(
        key: UUID,
        args: EIP1193RequestParameters,
        windowId: UUID,
        baseUrl: string,
    ): Window | undefined {
        const url = new URL("request", baseUrl)
        const opts = {
            windowId: windowId,
            key: key,
            args: btoa(JSON.stringify(args)),
        }
        const searchParams = new URLSearchParams(opts).toString()
        const popup = window.open(`${url}?${searchParams}`, "_blank", BasePopupProvider.POPUP_FEATURES)

        return popup ?? undefined
    }

    public handleRequestResolution(data: ProviderEvent | ProviderMsgsFromIframe[Msgs.RequestResponse]) {
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

    // ------------------------- Abstract functions -------------------------

    /** Returns connected status */
    public abstract isConnected(): boolean

    /**
     * Whenever requiresUserApproval is true for a request, this is called to check if additional
     * permissions are required for the request to proceed (e.g. trying to make a request when the
     * app isn't connected to the wallet, requiring a connection authorization).
     *
     * The method should solicit the permissions from the user and then return whether the original
     * request is be treated as permissionless or requires a further user approval.
     *
     * The return value is needed because in some cases we cannot know in advance if a request
     * requires user approval. This is the case with permission requests: we can only know if the
     * permission was already granted after we are connected. In this case requiresUserApproval must
     * be conservative and return true, but we can correct things after connection by returning true
     * from this function.
     */
    protected abstract requestExtraPermissions(args: EIP1193RequestParameters): Promise<boolean>

    /** used by iframe to check for user and auth status */
    protected abstract performOptionalUserAndAuthCheck(): Promise<void>

    /**
     * Method to determine if a request requires user approval.
     * Must return true if unable to determine and/or if extra permissions (beyond user approval) are required.
     */
    protected abstract requiresUserApproval(args: EIP1193RequestParameters): Promise<boolean>

    protected abstract handlePermissionless(key: UUID, args: EIP1193RequestParameters): void
}
