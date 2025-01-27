import { type RejectType, type ResolveType, type UUID, createUUID, promiseWithResolvers } from "@happychain/common"
import SafeEventEmitter from "@metamask/safe-event-emitter"
import { EIP1193UserRejectedRequestError, GenericProviderRpcError } from "../errors"
import type { EIP1193RequestParameters, EIP1193RequestResult } from "../interfaces/eip1193"
import type { Msgs, ProviderMsgsFromIframe } from "../interfaces/events"

type Timer = ReturnType<typeof setInterval>

type InFlightRequest = {
    resolve: ResolveType<EIP1193RequestResult>
    reject: RejectType
    popup?: Window
}

const POPUP_FEATURES = ["width=400", "height=800", "popup=true", "toolbar=0", "menubar=0"].join(",")

/**
 * This class serves as a base for EIP-1193 providers that sometimes need to create popups to
 * collect user approval. In particular, we have one such provider living on the app that relays
 * requests to the iframe, and one such provider living in the iframe which is for requests
 * initiated from within the iframe.
 *
 * Requests are made via the {@link request} method, which calls the {@link requiresUserApproval}
 * and sometimes the {@link requestExtraPermissions} method to determine whether an approval popup
 * is needed. If so, a popup is created. The user approval or rejection is relayed by the popup to
 * the iframe, which relays it to the provider in a way that triggers the
 * {@link handleRequestResolution} method (wiring up the popup message to this method is up to the
 * subclasses). If no approval is required, the {@link handlePermissionless} method is called
 * instead.
 *
 * The {@link requestExtraPermissions} method is called to check if some permissions (beyond a
 * simple user approval) are required for the request to proceed (so far this only happens when the
 * app tries to make a request but isn't connected to the wallet). The method should attempt getting
 * the permissions from the user (i.e. implement prompting) and then return a boolean whose meaning
 * is "does this still requires user approval?".
 *
 * Note that {@link requestExtraPermissions} is only called when {@link requiresUserApproval}
 * returns true. First, connecting is only useful in those cases. Second, permission requests are
 * either permissionless or not, depending on whetherthe permission was previously granted. This
 * can only be ascertained after the user is connected, hence the return value.
 *
 * The class includes logic that checks if a popup was closed instead of giving an explicit approval
 * or rejection, which is then equated to a rejection.
 *
 * The class extends the {@link https://github.com/MetaMask/safe-event-emitter | SafeEventEmitter}
 * class to enable emitting events on instances of this class without having to handle the errors
 * that can possibly be thrown by the handlers (these are thrown in a setTimeout instead).
 */
export abstract class BasePopupProvider extends SafeEventEmitter {
    // === FIELDS ==================================================================================
    protected abstract popupBaseUrl: string

    private readonly inFlightRequests: Map<string, InFlightRequest>
    private timer: Timer | null = null

    protected constructor(private windowId: UUID) {
        super()
        // must be initialized here for tree-shaking
        this.inFlightRequests = new Map()
    }

    // === PUBLIC INTERFACE ========================================================================

    /**
     * Sends an EIP-1193 request to the provider.
     */
    public async request(args: EIP1193RequestParameters): Promise<EIP1193RequestResult> {
        const key = createUUID()
        const { promise, resolve, reject } = promiseWithResolvers<EIP1193RequestResult>()
        const requiresApproval = (await this.requiresUserApproval(args)) && (await this.requestExtraPermissions(args))
        console.log("BasePopupProvider:request, requiresApproval:", requiresApproval)
        // noinspection JSVoidFunctionReturnValueUsed
        const popup = requiresApproval
            ? this.openPopupAndAwaitResponse(key, args, this.windowId as UUID)
            : this.handlePermissionless(key, args)
        this.trackRequest(key, { resolve, reject, popup: popup })
        return promise
    }

    /**
     * The subclasses must make sure that this method gets called whenever the popup answers a
     * request.
     */
    public handleRequestResolution(data: ProviderMsgsFromIframe[Msgs.RequestResponse]): void {
        const req = this.inFlightRequests.get(data.key)
        if (!req) return

        const { resolve, reject, popup } = req
        this.inFlightRequests.delete(data.key)
        popup?.close()

        if (data.error) reject(new GenericProviderRpcError(data.error))
        else resolve(data.payload)
    }

    // === ABSTRACT METHODS ========================================================================

    /**
     * Returns true if a request requires user approval, if unable to determine, and/or if extra
     * permissions (beyond user approval) are required.
     */
    protected abstract requiresUserApproval(args: EIP1193RequestParameters): Promise<boolean>

    /**
     * Whenever {@link requiresUserApproval} is true for a request, this is called to check if
     * additional permissions are required for the request to proceed (e.g. trying to make a request
     * when the app isn't connected to the wallet).
     *
     * The method should solicit the permissions from the user and then return a boolean signifying
     * "does this request still require user approval?".
     *
     * The return value is needed because in some cases we cannot know in advance if a request
     * requires user approval. This is the case with permission requests: we can only know if the
     * permission was already granted after we are connected. In this case
     * {@link requiresUserApproval} must be conservative and return true, but we can correct things after
     * connection by returning false from this function.
     */
    protected abstract requestExtraPermissions(args: EIP1193RequestParameters): Promise<boolean>

    /**
     * Handles a request that does not require user approval.
     */
    // Return type is undefined on purpose, avoid overrides returning anything.
    protected abstract handlePermissionless(key: UUID, args: EIP1193RequestParameters): undefined

    // === PRIVATE METHODS =========================================================================

    /**
     * Opens a popup window for the user request approval process.
     */
    private openPopupAndAwaitResponse(key: UUID, args: EIP1193RequestParameters, windowId: UUID): Window | undefined {
        const url = new URL("request", this.popupBaseUrl)
        const selector = `iframe[slot=frame][title=happy-iframe-slot][src^='${this.popupBaseUrl}']`
        const DOMframe = document.querySelector(selector) as HTMLIFrameElement
        const iframeIndex = Array.from(window.frames).findIndex((frame) => frame === DOMframe?.contentWindow)
        const opts = {
            windowId: windowId,
            key: key,
            args: btoa(JSON.stringify(args)),
            iframeIndex: iframeIndex.toString(),
        }
        const searchParams = new URLSearchParams(opts).toString()
        const popup = window.open(`${url}?${searchParams}`, "_blank", POPUP_FEATURES)
        return popup ?? undefined
    }

    /**
     * Adds a request to the set of in-flight requests. The request is associated with a unique
     * key and will be tracked until it is either resolved or rejected. If the request involves a
     * popup, the popup is also periodically checked for closure.
     */
    private trackRequest(requestKey: UUID, { resolve, reject, popup }: InFlightRequest): void {
        this.inFlightRequests.set(requestKey, { resolve, reject, popup })

        // Start checking for popup closure, unless this process doesn't involve a popup, or the
        // process is already running.
        if (!popup || this.timer) return

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

            if (this.timer && withPopups === 0) {
                clearInterval(this.timer)
                this.timer = null
            }
        }, 100)
    }
}
