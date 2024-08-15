import SafeEventEmitter from '@metamask/safe-event-emitter'
import type { EIP1193RequestFn, EIP1474Methods } from 'viem'

import { requiresApproval } from '../permissions'

import { EIP1193UserRejectedRequestError, GenericProviderRpcError } from './errors'
import type { EIP1193ProxiedEvents, EIP1193RequestArg, EventUUID } from './events'
import type { EIP1193ConnectionHandler, HappyProviderConfig } from './interface'

type Timer = ReturnType<typeof setInterval>

type InFlightRequest = {
    // biome-ignore lint/suspicious/noExplicitAny: difficult type, viem _returnType
    resolve: (value: any) => void
    reject: (reason?: unknown) => void
    popup: Window | null
}

const POPUP_FEATURES = ['width=400', 'height=800', 'popup=true', 'toolbar=0', 'menubar=0'].join(',')

export class RemoteConnectionHandler extends SafeEventEmitter implements EIP1193ConnectionHandler {
    private inFlight = new Map<string, InFlightRequest>()
    private timer: Timer | null = null

    constructor(private config: HappyProviderConfig) {
        super()

        config.providerBus.on('provider:event', this.handleProviderNativeEvent.bind(this))

        // Social Auth (Iframe Proxy)
        config.providerBus.on('response:complete', this.handleCompletedRequest.bind(this))
    }
    request: EIP1193RequestFn<EIP1474Methods> = async (args) => {
        // Every request gets proxied through this function.
        // If it is eth_call or a non-tx non-signature request, we can auto-approve
        // by posting the request args using request:approve,
        // otherwise we open the popup and pass the request args through the hash URL.
        const key = crypto.randomUUID()

        return new Promise((resolve, reject) => {
            const requiresUserApproval = requiresApproval(args)

            const popup = requiresUserApproval ? this.promptUser(key, args) : this.autoApprove(key, args)

            this.queueRequest(key, { resolve, reject, popup })
        })
    }
    isConnected(): boolean {
        // this is the fallback handler, always marked as 'connected' for public RPC's etc
        return true
    }

    private handleProviderNativeEvent(data: EIP1193ProxiedEvents['provider:event']) {
        this.emit(data.payload.event, data.payload.args)
    }

    private handleCompletedRequest(data: EIP1193ProxiedEvents['response:complete']) {
        const req = this.inFlight.get(data.key)

        if (!req) {
            return { resolve: null, reject: null }
        }

        const { resolve, reject, popup } = req
        this.inFlight.delete(data.key)
        popup?.close()

        if (reject && data.error) {
            reject(
                new GenericProviderRpcError({
                    code: data.error.code,
                    message: '',
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
        this.inFlight.set(key, { resolve, reject, popup })

        if (!this.timer && popup) {
            this.timer = setInterval(() => {
                let withPopups = 0
                for (const [k, req] of this.inFlight) {
                    if (!req.popup) {
                        continue
                    }

                    if (req.popup.closed) {
                        // manually closed without explicit rejection
                        req.reject(new EIP1193UserRejectedRequestError())
                        this.inFlight.delete(k)
                    } else {
                        // still open
                        withPopups++
                    }
                }

                if (this.timer && !withPopups) {
                    clearInterval(this.timer)
                }
            }, 500) // every half second, check if popup has been manually closed
        }
    }

    private autoApprove(key: EventUUID, args: EIP1193RequestArg) {
        this.config.providerBus.emit('request:approve', {
            key,
            uuid: this.config.uuid,
            error: null,
            payload: args,
        })
        return null
    }

    private promptUser(key: EventUUID, args: EIP1193RequestArg) {
        const url = new URL('request', this.config.iframePath)
        const searchParams = new URLSearchParams({
            key: key,
            args: btoa(JSON.stringify(args)),
            uuid: this.config.uuid,
        }).toString()
        return window.open(`${url}?${searchParams}`, '_blank', POPUP_FEATURES)
    }
}
