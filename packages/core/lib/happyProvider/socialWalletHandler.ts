import type { Resolvers, UUID } from "@happy.tech/common"
import { createUUID, promiseWithResolvers } from "@happy.tech/common"
import type { EIP1193RequestParameters, HappyUser, ProviderMsgsFromWallet } from "@happy.tech/wallet-common"
import { AuthState, BasePopupProvider, LoginRequiredError, Msgs, OverlayErrorCode } from "@happy.tech/wallet-common"
import { IFRAME_PATH } from "../env"
import { type HappyProviderConfig, HappyProviderImplem } from "./happyProviderImplem"
import type { EIP1193ConnectionHandler } from "./interface"

/**
 * SocialWalletHandler handles proxying EIP-1193 requests
 * to the iframe where it is handled by either the connected
 * social provider if the user is connected, or a public rpc
 * if there is no user connected. For requests that require explicit
 * user approval/confirmation these requests are sent to a popup window
 * where the user can approve/reject the requests before they are sent
 * to the iframe to be handled
 */
export class SocialWalletHandler extends BasePopupProvider implements EIP1193ConnectionHandler {
    // === SETUP ===================================================================================
    protected readonly popupBaseUrl

    #user: HappyUser | undefined
    #authState: AuthState = AuthState.Initializing
    #inFlightPermissionChecks = new Map<string, Resolvers<boolean>>()

    constructor(private config: HappyProviderConfig) {
        super(config.windowId)
        this.popupBaseUrl = IFRAME_PATH

        config.msgBus.on(Msgs.UserChanged, this.#setUser.bind(this))
        config.msgBus.on(Msgs.AuthStateChanged, this.#setAuthState.bind(this))
        config.providerBus.on(Msgs.RequestResponse, this.handleRequestResolution.bind(this))
        config.providerBus.on(Msgs.PermissionCheckResponse, this.#handlePermissionCheck.bind(this))
    }

    // === ABSTRACT METHOD IMPLEMENTATION ==========================================================

    public isConnected(): boolean {
        // The social provider is always connected: it can always access the iframe's provider
        // for public calls.
        return true
    }

    protected onPopupBlocked() {
        HappyProviderImplem.instance().displayError(OverlayErrorCode.PopupBlocked)
    }

    protected override requiresUserApproval(args: EIP1193RequestParameters): Promise<boolean> {
        const key = createUUID()
        const { promise, resolve, reject } = promiseWithResolvers<boolean>()
        this.#inFlightPermissionChecks.set(key, { resolve, reject })

        void this.config.providerBus.emit(Msgs.PermissionCheckRequest, {
            key,
            windowId: this.config.windowId,
            payload: args,
            error: null,
        })

        return promise
    }

    protected handlePermissionless(key: UUID, args: EIP1193RequestParameters): undefined {
        // Note that this always works regardless of log in or connection status.
        void this.config.providerBus.emit(Msgs.RequestPermissionless, {
            key,
            windowId: this.config.windowId,
            error: null,
            payload: args,
        })
    }

    /**
     * requestExtraPermissions is short circuited by requiresUserApproval. If the request does not
     * require permissions (i.e. eth_chainId) then this function will not be called. Here we check
     * if the user first requires either a Login and/or a Connection. In the event they need to
     * log in, we throw an error so that the root HappyProvider may prompt the user, then retry the
     * request using their preferred connection provider (this or injected) if needed. In the event
     * they are already logged in, but the dapp does not have eth_accounts permissions, we will
     * either intercept here and request these permissions before proceeding if the original
     * request was unrelated (ie. sendTransaction) or if it was already a connection request, we
     * can allow the flow to proceed as normal and the user will approve in the popup as usual.
     */
    protected override async requestExtraPermissions(args: EIP1193RequestParameters): Promise<boolean> {
        // We are connected, no need for extra permissions, we needed approval before and still do.
        if (this.#user) return true

        // We are completely logged out, we need to log in.
        // HappyProvider will manage re-executing the original request if needed
        // and will resubmit here, or to the injectedHandler depending on what the user
        // connects with
        if (this.#authState === AuthState.Disconnected) {
            // throw an error, so that login can be handled at the root HappyProvider
            // this is required so that if the user logs in with the injected wallet
            // we can continue the request there instead of here with the social wallet
            throw new LoginRequiredError()
        }

        // biome-ignore format: readability
        const isConnectionRequest
            =  args.method === "eth_requestAccounts"
            || args.method === "wallet_requestPermissions"
                && args.params.some((p) => p.eth_accounts)

        // We are already logged in, but don't have the correct permissions. If this was not already
        // a connection request, we make an explicit connection request, before proceeding with the
        // original request. Otherwise, we can just proceed and execute the original request directly
        if (!isConnectionRequest) {
            await this.request({
                method: "wallet_requestPermissions",
                params: [{ eth_accounts: {} }],
            })
        }

        if (args.method === "wallet_requestPermissions") {
            return await this.requiresUserApproval(args) // still requires approval?
        }

        // Everything else (non-permission requests): required approval to begin with and still does.
        // Now that we are connected, these other requests can be made.
        return true
    }

    // === EVENT HANDLERS ==========================================================================

    #handlePermissionCheck(data: ProviderMsgsFromWallet[Msgs.PermissionCheckResponse]) {
        const inFlight = this.#inFlightPermissionChecks.get(data.key)
        if (!inFlight) return
        if (typeof data.payload === "boolean") {
            inFlight.resolve(data.payload)
        } else {
            inFlight.reject(data.error)
        }
        this.#inFlightPermissionChecks.delete(data.key)
    }

    #setUser(user: HappyUser | undefined) {
        this.#user = user
    }
    #setAuthState(authState: AuthState) {
        this.#authState = authState
    }
}
