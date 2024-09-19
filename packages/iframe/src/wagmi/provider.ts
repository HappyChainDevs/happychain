import {
    AuthState,
    type EIP1193RequestMethods,
    type EIP1193RequestParameters,
    type EIP1193RequestResult,
    EIP1193UserRejectedRequestError,
    Msgs,
    type UUID,
    config,
    createUUID,
} from "@happychain/sdk-shared"
import type { EIP1193Provider } from "viem"
import { PublicClientApproveHandler } from "../middleware/publicClient"
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

export class CustomProviderExample {
    private inFlightRequests = new Map<string, InFlightRequest>()
    private inFlightChecks = new Map<string, InFlightCheck>()
    private timer: Timer | null = null

    public async request<TString extends EIP1193RequestMethods = EIP1193RequestMethods>(
        args: EIP1193RequestParameters<TString>,
    ): Promise<EIP1193RequestResult<TString>> {
        const key = createUUID()

        // biome-ignore lint/suspicious/noAsyncPromiseExecutor: we need this to resolve elsewhere
        return new Promise(async (resolve, reject) => {
            const requiresUserApproval = checkIfRequestRequiresConfirmation(args)

            if (!requiresUserApproval) {
                // forward request to PublicClientApproveHandler
                // await PublicClientApproveHandler(requestData);
                // const popup = autoApprove()
                // this.queueRequest(key, { resolve, reject, popup });
                // return;
            }

            const popup = this.openPopupAndAwaitResponse(key, args)
            this.queueRequest(key, { resolve, reject, popup })
        })
    }

    private queueRequest(key: string, { resolve, reject, popup }: InFlightRequest) {
        this.inFlightRequests.set(key, { resolve, reject, popup })

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
        const url = new URL("request", config.iframePath)
        const opts = {
            key: key,
            args: btoa(JSON.stringify(args)),
        }
        const searchParams = new URLSearchParams(opts).toString()
        return window.open(`${url}?${searchParams}`, "_blank", POPUP_FEATURES)
    }
}

export const customProvider = new CustomProviderExample() as unknown as EIP1193Provider
