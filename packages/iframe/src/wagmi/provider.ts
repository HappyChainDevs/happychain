import {
    type EIP1193RequestMethods,
    type EIP1193RequestParameters,
    type EIP1193RequestResult,
    EIP1193UserRejectedRequestError,
    GenericProviderRpcError,
    type UUID,
    config,
    createUUID,
} from "@happychain/sdk-shared"
import SafeEventEmitter from "@metamask/safe-event-emitter"
import type { EIP1193Provider } from "viem"
import { handlePermissionlessRequest } from "../requests"
import { checkIfRequestRequiresConfirmation } from "../utils/checkPermissions"

const POPUP_FEATURES = ["width=400", "height=800", "popup=true", "toolbar=0", "menubar=0"].join(",")

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

/**
 * Custom Provider for the iframe fed to WagmiProvider's config to route wagmi
 * hook calls to our middleware functions (where viem handles the calls).
 *
 * Provider is fed into a {@link https://wagmi.sh/core/api/connectors/injected#target | custom Connector}
 * which is configured to represent the HappyChain's iframe provider as below.
 */
export class IframeProvider extends SafeEventEmitter {
    public iframeId = createUUID()

    private inFlightRequests = new Map<string, InFlightRequest>()
    private inFlightChecks = new Map<string, InFlightCheck>()
    private timer: Timer | null = null

    // no promise resolution
    public async request<TString extends EIP1193RequestMethods = EIP1193RequestMethods>(
        args: EIP1193RequestParameters<TString>,
    ): Promise<EIP1193RequestResult<TString>> {
        const key = createUUID()

        // biome-ignore lint/suspicious/noAsyncPromiseExecutor: we need this to resolve elsewhere
        return new Promise(async (resolve, reject) => {
            const requiresUserApproval = checkIfRequestRequiresConfirmation(args)

            if (!requiresUserApproval) {
                const permissionlessReqPayload = {
                    key,
                    windowId: this.iframeId,
                    error: null,
                    payload: args,
                }

                void handlePermissionlessRequest(permissionlessReqPayload)

                this.queueRequest(key, { resolve, reject, popup: null })
                return
            }

            // permissioned requests
            const popup = this.openPopupAndAwaitResponse(key, args)
            this.queueRequest(key, { resolve, reject, popup })
        })
    }

    private queueRequest(key: string, { resolve, reject, popup }: InFlightRequest) {
        this.inFlightRequests.set(key, { resolve, reject, popup })
        console.log(this.inFlightRequests)

        const intervalMs = 100

        if (!this.timer && popup) {
            // every interval, check if popup has been manually closed
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
            }, intervalMs)
        }
    }

    private openPopupAndAwaitResponse(key: UUID, args: EIP1193RequestParameters) {
        // handled my middleware
        const url = new URL("request", config.iframePath)
        const opts = {
            windowId: this.iframeId,
            key: key,
            args: btoa(JSON.stringify(args)),
        }
        const searchParams = new URLSearchParams(opts).toString()
        return window.open(`${url}?${searchParams}`, "_blank", POPUP_FEATURES)
    }

    // biome-ignore lint/suspicious/noExplicitAny: currently testing, will remove once approach is approved
    public handleRequestResolution(data: any) {
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
}

export const iframeProvider = new IframeProvider() as IframeProvider & EIP1193Provider
