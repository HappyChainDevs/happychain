import { promiseWithResolvers } from "@happychain/common"
import { type UUID, createUUID } from "../common-utils"

import {
    AuthState,
    BasePopupProvider,
    type EIP1193RequestParameters,
    EIP1193UserRejectedRequestError,
    type HappyUser,
    Msgs,
    type ProviderMsgsFromIframe,
    waitForCondition,
} from "@happychain/sdk-shared"
import { ModalStates } from "@happychain/sdk-shared"
import type { HappyProviderConfig } from "./interface"

type InFlightCheck = {
    resolve: (value: boolean) => void
    reject: (reason?: unknown) => void
}

/**
 * SocialWalletHandler handles proxying EIP-1193 requests
 * to the iframe where it is handled by either the connected
 * social provider if the user is connected, or a public rpc
 * if there is no user connected. For requests that require explicit
 * user approval/confirmation these requests are sent to a popup window
 * where the user can approve/reject the requests before they are sent
 * to the iframe to be handled
 */
export class SocialWalletHandler extends BasePopupProvider {
    private inFlightChecks = new Map<string, InFlightCheck>()

    private user: HappyUser | undefined
    private authState: AuthState = AuthState.Connecting

    constructor(private config: HappyProviderConfig) {
        super(config.windowId)
        // sync local user state
        config.msgBus.on(Msgs.UserChanged, (_user) => {
            this.user = _user
        })

        config.msgBus.on(Msgs.AuthStateChanged, (_authState) => {
            this.authState = _authState
        })

        config.providerBus.on(Msgs.ProviderEvent, this.handleProviderNativeEvent.bind(this))

        // Social Auth (Iframe Proxy)
        config.providerBus.on(Msgs.RequestResponse, this.handleRequestResolution.bind(this))

        config.providerBus.on(Msgs.PermissionCheckResponse, this.handlePermissionCheck.bind(this))
    }

    protected override async requiresUserApproval(args: EIP1193RequestParameters): Promise<boolean> {
        const key = createUUID()
        return new Promise((resolve, reject) => {
            this.config.providerBus.emit(Msgs.PermissionCheckRequest, {
                key,
                windowId: this.config.windowId,
                payload: args,
                error: null,
            })

            this.inFlightChecks.set(key, { resolve, reject })
        })
    }

    protected handlePermissionless(key: UUID, args: EIP1193RequestParameters): void {
        void this.config.providerBus.emit(Msgs.RequestPermissionless, {
            key,
            windowId: this.config.windowId,
            error: null,
            payload: args,
        })
    }

    /**
     * Requests the user to log in, returns true if that succeeded, false if cancelled or failed.
     */
    private async requestLogin(): Promise<boolean> {
        void this.config.msgBus.emit(Msgs.RequestDisplay, ModalStates.Login)

        const { promise, resolve } = promiseWithResolvers<boolean>()
        const key = createUUID()

        // TODO: Verify that state.cancelled is properly set in all cases where the login fails.

        const unsubscribeClose = this.config.msgBus.on(Msgs.ModalToggle, (state) => {
            if (state.isOpen) return
            // The login modal was closed.
            unsubscribeClose()
            if (state.cancelled) {
                // Closing is because the user cancelled the login (or it failed).
                unsubscribeSuccess()
                this.inFlightChecks.delete(key)
                resolve(false)
            }
            // Otherwise the login is successful, the UserChanged callback will be called.
        })

        // NOTE: This *should* be safe: either the logging succeeds from this app and we get
        // connection permission auto-granted (and get the user as a result), or it fails (possibly
        // because logging was complete from another app first?) and the ModdlaToggle callback will
        // be called.

        const unsubscribeSuccess = this.config.msgBus.on(Msgs.UserChanged, (user) => {
            if (!user) return
            resolve(true) // successfully logged in
            unsubscribeSuccess()
            unsubscribeClose()
        })

        return promise
    }

    protected override async requestExtraPermissions(args: EIP1193RequestParameters): Promise<boolean> {
        // We are connected, no need for extra permissions, we needed approval before and still do.
        if (this.user) return true

        // We're currently logging in or out, wait until that is settled to proceed.
        await waitForCondition(() => this.authState !== AuthState.Connecting)

        // biome-ignore format: readability
        const isConnectionRequest
            =  args.method === "eth_requestAccounts"
            || args.method === "wallet_requestPermissions"
                && args.params.find((p) => p.eth_accounts)

        // We are logged out, we need to log in, which will auto-grant connection permission.
        if (this.authState === AuthState.Disconnected) {
            const loggedIn = await this.requestLogin()
            if (!loggedIn) throw new EIP1193UserRejectedRequestError()
        }

        // We are logged in but not connected.
        else if (!this.user) {
            // This requested the connection permission directly, let user approve it explicitly.
            if (isConnectionRequest) return true // still requires approval

            // Recursively request a connection permission (base case is the `if` right above).
            // There's a tiny chance we got logged out in the interface, then the request simply
            // fails.
            await this.request({
                method: "wallet_requestPermissions",
                params: [{ eth_accounts: {} }],
            })
        }

        // NOTE: How we handle permission requests (eth_requestAccounts, wallet_requestPermissions)
        //
        // 1. Only connection permission requested.
        //    A. If we were already connected, `requiresUserApproval` returned false,
        //       this function doesn't get called.
        //    B. If we logged in in this function, implicitly granted, must handle below.
        //    C. If not, we returned above (`if (isConnectionRequest)` to get explicit user approval.
        //
        // 2. Non-connection permissions requested.
        //    A. If we were already connected & we had the permissions, `requiresUserApproval`
        //       returned false, this function doesn't get called.
        //    B. If we were already connected but didn't have the permissions, we returned true
        //       at the top of this function.
        //    C. If we logged in in this function, we have been implicitly connected,
        //       must handle below.
        //    D. Otherwise, we have explicitly connected through the recursive
        //       `wallet_requestPermissions` call above, must handle below.
        //
        // 3. Mixed connection and non-connection permissions requested.
        //    A, B, C:  Same as 2A, 2B, 2C.
        //    D. Otherwise, we returned above (`is (isConnectionRequest`) to get explicit user approval.
        //
        // The below logic will handles cases 1B, 2C, 2D, 3C.

        // biome-ignore format: readability
        const onlyConnectionRequested
            =  args.method === "eth_requestAccounts"
            || args.method === "wallet_requestPermissions"
                && args.params.length === 1
                && "eth_accounts" in Object.keys(args.params[0])

        // Case 1B: connection permission implicitly granted by logging in.
        if (onlyConnectionRequested) return false

        // Cases 2C, 2D, 3C: we're now connected and have requested other permissions, check to see
        // if we have them.
        if (args.method === "wallet_requestPermissions") {
            return await this.requiresUserApproval(args) // still requires approval?
        }

        // Everything else (non-permission requests): required approval to begin with and still does.
        // Now that we are connected, these other requests can be made.
        return true
    }

    isConnected(): boolean {
        // this is the fallback handler, always marked as 'connected' for public RPC's etc
        return true
    }

    private async handlePermissionCheck(data: ProviderMsgsFromIframe[Msgs.PermissionCheckResponse]) {
        const inFlight = this.inFlightChecks.get(data.key)
        if (!inFlight) return
        if (typeof data.payload === "boolean") {
            inFlight.resolve(data.payload)
        } else {
            inFlight.reject(data.error)
        }
        this.inFlightChecks.delete(data.key)
    }

    private handleProviderNativeEvent(data: ProviderMsgsFromIframe[Msgs.ProviderEvent]) {
        this.emit(data.payload.event, data.payload.args)
    }

    protected async performOptionalUserAndAuthCheck(): Promise<void> {}
}
