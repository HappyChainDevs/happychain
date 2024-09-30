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

export abstract class BaseProviderClass extends SafeEventEmitter {
    protected inFlightRequests = new Map<string, InFlightRequest>()
    protected timer: Timer | null = null
    protected POPUP_FEATURES = ["width=400", "height=800", "popup=true", "toolbar=0", "menubar=0"].join(",")

    abstract isConnected(): boolean

    public abstract request<TString extends EIP1193RequestMethods = EIP1193RequestMethods>(
        args: EIP1193RequestParameters<TString>,
    ): Promise<EIP1193RequestResult<TString>>

    protected abstract openPopupAndAwaitResponse?(key: UUID, args: EIP1193RequestParameters): Window | null

    protected queueRequest(key: string, { resolve, reject, popup }: InFlightRequest) {
        this.inFlightRequests.set(key, { resolve, reject, popup })
        this.startPopupCheckTimer()
    }

    private startPopupCheckTimer() {
        if (this.timer) return

        const intervalMs = 100
        this.timer = setInterval(() => {
            let withPopups = 0
            for (const [key, req] of this.inFlightRequests) {
                if (!req.popup) continue

                if (req.popup.closed) {
                    req.reject(new EIP1193UserRejectedRequestError())
                    this.inFlightRequests.delete(key)
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

    protected generateKey(): UUID {
        return createUUID()
    }
}
