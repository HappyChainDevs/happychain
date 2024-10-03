import { type UUID, createUUID } from "@happychain/common"
import SafeEventEmitter from "@metamask/safe-event-emitter"
import type { EIP1193RequestMethods, EIP1193RequestParameters, EIP1193RequestResult } from "../interfaces/eip1193"
import { EIP1193UserRejectedRequestError } from "../interfaces/errors"

type Timer = ReturnType<typeof setInterval>

type InFlightRequest<T extends EIP1193RequestMethods = EIP1193RequestMethods> = {
    resolve: (value: EIP1193RequestResult<T>) => void
    reject: (reason?: unknown) => void
    popup: Window | null
}

export type ResolveType<T extends EIP1193RequestMethods = EIP1193RequestMethods> = (
    value: EIP1193RequestResult<T>,
) => void

/**
 * @abstract BasePopupProvider
 *
 * This class serves as the base for providers that handle EIP-1193 requests.
 * It extends the {@link https://github.com/MetaMask/safe-event-emitter | SafeEventEmitter} to manage events and maintains a queue for
 * in-flight requests that may require popups for user interaction.
 *
 * The class provides mechanisms for handling these requests, managing popups,
 * and automatically checking if a popup was closed, which triggers request rejection
 * in such cases.
 *
 * Child classes must implement the `isConnected` and `request` methods to define
 * how the provider connects and handles requests.
 */
export abstract class BasePopupProvider extends SafeEventEmitter {
    protected inFlightRequests = new Map<string, InFlightRequest>()
    protected timer: Timer | null = null
    protected POPUP_FEATURES = ["width=400", "height=800", "popup=true", "toolbar=0", "menubar=0"].join(",")

    /**
     * Abstract method to check if the provider is connected. Must be implemented by child classes.
     *
     * @returns {boolean} - Returns true if the provider is connected, otherwise false.
     */
    abstract isConnected(): boolean

    /**
     * Abstract method to send requests. This method must be implemented by child classes.
     * It sends an EIP-1193 request and returns a Promise with the result.
     *
     * @param {EIP1193RequestParameters<TString>} args - The parameters for the request.
     * @returns {Promise<EIP1193RequestResult<TString>>} - A promise resolving with the result of the request.
     */
    public abstract request<TString extends EIP1193RequestMethods = EIP1193RequestMethods>(
        args: EIP1193RequestParameters<TString>,
    ): Promise<EIP1193RequestResult<TString>>

    /**
     * Adds a request to the queue of in-flight requests. The request is associated with a unique key
     * and will be tracked until it is either resolved or rejected. If the request involves a popup,
     * the popup is also tracked for closure.
     *
     * @param {string} key - A unique identifier for the request.
     * @param {InFlightRequest} request - The request object containing resolve and reject callbacks,
     * and the associated popup (if any).
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
     *
     * @returns {UUID} - A unique identifier (UUID) for the request.
     */
    protected generateKey(): UUID {
        return createUUID()
    }
}
