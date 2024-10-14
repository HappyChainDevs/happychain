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
        super()
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

    protected override async requiresUserApproval(
        args: EIP1193RequestParameters,
        key: UUID,
    ): Promise<boolean | unknown> {
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

        let resolve: (value: boolean | PromiseLike<boolean>) => void
        const result = new Promise<boolean>((_resolve) => {
            resolve = _resolve
        })

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

        return result
    }

    protected override async requestExtraPermissions(args: EIP1193RequestParameters): Promise<boolean> {
        // We are connected, no need for extra permissions, we needed approval before and still do.
        if (this.user) return /* stillRequiresApproval = */ true

        // We're currently logging in or out, wait until that is settled to proceed.
        await waitForCondition(() => this.authState !== AuthState.Connecting)

        // We are logged out, we need to log in, which will auto-grant connection permission.
        if (this.authState === AuthState.Disconnected) {
            const loggedIn = await this.requestLogin()
            if (!loggedIn) throw new EIP1193UserRejectedRequestError()
        }
        // We are logged in but not connected, request connection.
        else if (!this.user) {
            // There's a tiny chance we got logged out in the interface, then the request simply
            // fails.
            await this.request({
                method: "wallet_requestPermissions",
                params: [{ eth_accounts: {} }],
            })
        }

        // biome-ignore format: readability
        const isConnectionRequest =
            args.method === "eth_requestAccounts"
            || args.method === "wallet_requestPermissions"
                && args.params.length === 1
                && Object.keys(args.params).length === 1
                && "eth_accounts" in args.params[0]

        // If requesting a connection permission, it was granted by logging in or connecting, no
        // need for further approval. Otherwise, if multiple permissions were requested, we need
        // to recheck to see if all permissions are granted. Otherwise, we still need to approve.

        // biome-ignore format: readability
        const allPermissionsGranted = isConnectionRequest
          || (args.method === "wallet_requestPermissions" && await this.requiresApproval(args))

        return /* stillNeedsApproval = */ !allPermissionsGranted
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

    private async requiresApproval(args: EIP1193RequestParameters) {
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

    private handleProviderNativeEvent(data: ProviderMsgsFromIframe[Msgs.ProviderEvent]) {
        this.emit(data.payload.event, data.payload.args)
    }

    protected async performOptionalUserAndAuthCheck(): Promise<void> {}
}
