import { type UUID, createUUID } from "@happychain/common"
import {
    AuthState,
    type EIP1193ErrorObject,
    type EIP1193RequestMethods,
    type EIP1193RequestParameters,
    type EIP1193RequestResult,
    EIP1193UserRejectedRequestError,
    GenericProviderRpcError,
    type ProviderEventError,
    type ProviderEventPayload,
    config,
    waitForCondition,
} from "@happychain/sdk-shared"
import SafeEventEmitter from "@metamask/safe-event-emitter"
import { type EIP1193Provider, ResourceUnavailableRpcError } from "viem"
import { handlePermissionlessRequest } from "../requests"
import { handleApprovedRequest } from "../requests/approved"
import { iframeID } from "../requests/utils"
import { getAuthState } from "../state/authState"
import { getUser } from "../state/user"
import { checkIfRequestRequiresConfirmation } from "../utils/checkPermissions"

const POPUP_FEATURES = ["width=400", "height=800", "popup=true", "toolbar=0", "menubar=0"].join(",")

type Timer = ReturnType<typeof setInterval>

// custom type for promise resolve methods
type ResolveType<T extends EIP1193RequestMethods = EIP1193RequestMethods> = (value: EIP1193RequestResult<T>) => void

type InFlightRequest<T extends EIP1193RequestMethods = EIP1193RequestMethods> = {
    resolve: ResolveType<T>
    reject: (reason?: unknown) => void
    popup: Window | null
}

/**
 * Custom Provider for the iframe fed to WagmiProvider's config to route wagmi
 * hook calls to our middleware functions (where viem handles the calls).
 *
 * Provider is fed into a {@link https://wagmi.sh/core/api/connectors/injected#target | custom Connector}
 * which is configured to represent the HappyChain's iframe provider as below.
 */
export class IframeProvider extends SafeEventEmitter {
    private inFlightRequests = new Map<string, InFlightRequest>()
    private timer: Timer | null = null

    public async request<TString extends EIP1193RequestMethods = EIP1193RequestMethods>(
        args: EIP1193RequestParameters<TString>,
    ): Promise<EIP1193RequestResult<TString>> {
        if (!getUser()) {
            // Necessary because wagmi will attempt to reconnect on page load. This currently could
            // work fine (with a permission not found warning), but is brittle, better to explicitly
            // reject here. We explicitly connect to wagmi via `useConnect` once the user becomes
            // available.
            throw new ResourceUnavailableRpcError(new Error("user not initialized yet"))
        }

        const key = createUUID()

        await waitForCondition(() => getAuthState() !== AuthState.Connecting)

        return new Promise<EIP1193RequestResult<TString>>((resolve, reject) => {
            const reqPayload = {
                key,
                windowId: iframeID,
                error: null,
                payload: args,
            }

            const requiresUserApproval = checkIfRequestRequiresConfirmation(args)

            if (!requiresUserApproval) {
                // permissionless
                void handlePermissionlessRequest(reqPayload)
                this.queueRequest(key, { resolve: resolve as ResolveType, reject, popup: null })
                return
            }

            if (["eth_requestAccounts", "wallet_requestPermissions"].includes(args.method)) {
                // auto-approve internal iframe permissions without popups
                void handleApprovedRequest(reqPayload)
                this.queueRequest(key, { resolve: resolve as ResolveType, reject, popup: null })
                return
            }

            // permissioned requests
            const popup = this.openPopupAndAwaitResponse(key, args)
            this.queueRequest(key, { resolve: resolve as ResolveType, reject, popup })
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
            windowId: iframeID,
            key: key,
            args: btoa(JSON.stringify(args)),
        }
        const searchParams = new URLSearchParams(opts).toString()
        return window.open(`${url}?${searchParams}`, "_blank", POPUP_FEATURES)
    }

    public handleRequestResolution(
        data: ProviderEventPayload<EIP1193RequestResult> | ProviderEventError<EIP1193ErrorObject>,
    ) {
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
