import {
    AuthState,
    type EIP1193RequestMethods,
    type EIP1193RequestParameters,
    type EIP1193RequestResult,
    EIP1193UserRejectedRequestError,
    EventBus,
    EventBusMode,
    Msgs,
    type MsgsFromIframe,
    type UUID,
    config,
    createUUID,
    logger,
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

/**
 * Custom Provider for the iframe fed to WagmiProvider's config to route wagmi
 * hook calls to our middleware functions (where viem handles the calls).
 *
 * Provider is fed into a {@link https://wagmi.sh/core/api/connectors/injected#target | custom Connector}
 * which is configured to represent the HappyChain's iframe provider as below.
 */
export class IframeProvider {
    private inFlightRequests = new Map<string, InFlightRequest>()
    private inFlightChecks = new Map<string, InFlightCheck>()
    private timer: Timer | null = null

    private talkToWalletHandler = new EventBus<"..", "..">({
        mode: EventBusMode.IframePort,
        scope: "happy-chain-iframe-eip1193-provider",
        logger: logger,
        target: window,
    })

    public async request<TString extends EIP1193RequestMethods = EIP1193RequestMethods>(
        args: EIP1193RequestParameters<TString>,
    ): Promise<EIP1193RequestResult<TString>> {
        const key = createUUID()
        console.log({ args })

        // biome-ignore lint/suspicious/noAsyncPromiseExecutor: we need this to resolve elsewhere
        return new Promise(async (resolve, reject) => {
            
            const requiresUserApproval = checkIfRequestRequiresConfirmation(args)

            if (!requiresUserApproval) {
                // forward request to PublicClientApproveHandler
                const permissionlessReqPayload = {
                    key,
                    windowId: createUUID(),
                    error: null,
                    payload: args,
                }

                await PublicClientApproveHandler(permissionlessReqPayload)
                // ??? null situation
                const popup = null
                this.queueRequest(key, { resolve, reject, popup })
                return
            }

            // do we need to check if user is connected / logged in or can we assume that they are?

            const popup = this.openPopupAndAwaitResponse(key, args)
            this.queueRequest(key, { resolve, reject, popup })

            // once user clicks reject / accept, how do we move further
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

export const iframeProvider = new IframeProvider() as unknown as EIP1193Provider
