import { type UUID, createUUID } from "@happychain/common"
import SafeEventEmitter from "@metamask/safe-event-emitter"
import type { EIP1193RequestMethods, EIP1193RequestParameters, EIP1193RequestResult } from "../interfaces/eip1193"
import { EIP1193UserRejectedRequestError } from "../interfaces/errors"

type Timer = ReturnType<typeof setInterval>

type InFlightRequest<T extends EIP1193RequestMethods = EIP1193RequestMethods> = {
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
 * Requests are made via the `request` method, which calls the `requiresApproval` method to
 * determine whether an approval popup is needed. If so, a popup is created. The user approval or
 * rejection is relayed by the popup to the iframe, which relays it to the provider in a way that
 * triggers the `handleCompletedRequest` method. If no approval method is needed, the
 * `handlePermissionlessRequest` method is called instead.
 *
 * The `requestPermissions` method is called to check if some permissions (beyond a simple user
 * approval) are required for the request to proceed (so far this only happens when the app tries to
 * make a request but isn't authenticated in the wallet or connected to it). The method should make
 * the permisison request (which is allowed to be a recursive `request` call) and then return
 * specifying whether the original request is be treated as permissionless or requires a further
 * approval.
 *
 * Note that `requestPermissions` is only called when `requiresApproval` returns true. That's
 * because we allow permissionless access to the iframe provider, but suggesting things to the user
 * (usually signing transactions) is subject to the initial wallet connection approval. Some
 * requests (`wallet_requestPermissions`) can be be either permissionless (if the permission has
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
export abstract class BasePopupProvider extends SafeEventEmitter {
    protected inFlightRequests = new Map<string, InFlightRequest>()
    protected timer: Timer | null = null
    protected static readonly POPUP_FEATURES = ["width=400", "height=800", "popup=true", "toolbar=0", "menubar=0"].join(
        ",",
    )

    /**
     * Abstract method to send requests. This method must be implemented by child classes.
     * It sends an EIP-1193 request and returns a Promise with the result.
     */
    public abstract request<TString extends EIP1193RequestMethods = EIP1193RequestMethods>(
        args: EIP1193RequestParameters<TString>,
    ): Promise<EIP1193RequestResult<TString>>

    /**
     * Adds a request to the queue of in-flight requests. The request is associated with a unique key
     * and will be tracked until it is either resolved or rejected. If the request involves a popup,
     * the popup is also tracked for closure.
     */
    protected queueRequest(key: string, { resolve, reject, popup }: InFlightRequest): void {
        this.inFlightRequests.set(key, { resolve, reject, popup })
        this.startPopupCheckTimer()
    }

    /**
     * Starts a timer that periodically checks the status of popups related to in-flight requests.
     * If a popup is detected as closed, the corresponding request is rejected, and the request is removed
     * from the queue. The timer stops automatically when there are no more popups to track.
     *
     * @private
     */
    private startPopupCheckTimer(): void {
        if (this.timer) return

        const intervalMs = 100 // Check every 100ms

        this.timer = setInterval(() => {
            let withPopups = 0 // Count of active popups
            for (const [k, req] of this.inFlightRequests) {
                if (!req.popup) continue // Skip requests without popups

                // If the popup has been closed, reject the request
                if (req.popup.closed) {
                    req.reject(new EIP1193UserRejectedRequestError())
                    this.inFlightRequests.delete(k)
                } else {
                    withPopups++
                }
            }

            // Stop the timer if no popups are being tracked
            if (this.timer && !withPopups) {
                clearInterval(this.timer)
                this.timer = null
            }
        }, intervalMs)
    }

    /**
     * Generates a unique key to associate with in-flight requests. The key is a UUID
     * created using `createUUID` from the `@happychain/common` package.
     */
    protected generateKey(): UUID {
        return createUUID()
    }

    /** Returns connected status */
    protected abstract isConnected(): boolean

    /**
     * Opens a popup window for the user request approval process.
     */
    protected openPopupAndAwaitResponse(
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
}
