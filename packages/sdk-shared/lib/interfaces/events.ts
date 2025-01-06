import type { EIP1193EventName, EIP1193RequestParameters, EIP1193RequestResult } from "./eip1193.ts"
import type { EIP1193ErrorObject } from "./errors.ts"
import type { AuthState, HappyUser } from "./happyUser"
import type { ProviderEventError, ProviderEventPayload } from "./payloads.ts"

// =================================================================================================
// === EVENT LIST ==================================================================================

/**
 * Names of types of messages that can be sent on both the general message bus and the provider bus.
 */
export enum Msgs {
    // --- EventsFromApp ---------------------------------------------------------------------------

    /** Instructs the iframe to display the requested page. */
    RequestWalletDisplay = "request-wallet-display",

    /** Instructs the iframe to display the connection modal. */
    ConnectRequest = "connect-request",

    /**
     * A response from the iframe to the app that the connect modal is no longer in use.
     * Either the user connected successfully, or they closed the modal without connecting
     */
    ConnectResponse = "connect-response",

    /**
     * Informs the iframe that the user has connected/disconnected to/from an injected wallet.
     * This is emitted in response to {@link Msgs.InjectedWalletRequestConnect} and whenever
     * the user changes their account in the injected wallet.
     */
    InjectedWalletConnected = "injected-wallet:connected",

    /**
     * Instructs the iframe to mirror a permission that has been granted to the user by the
     * injected wallet.
     *
     * This is required because we depend on permissions to establish that the user is connected
     * to the wallet.
     */
    MirrorPermissions = "injected-wallet:mirror-permissions",

    // --- EventsFromIframe ------------------------------------------------------------------------

    /** Informs the SDK that the iframe has loaded and initialized. */
    IframeInit = "iframe-init",

    /** Instructs the SDK to resize the resize the iframe to toggle the wallet modal. */
    WalletVisibility = "wallet-visibility",

    /** Informs the app that the user information has changed (including connect & disconnect). */
    UserChanged = "user-changed",

    /** Informs the SDK of the current social authentication state of the user. */
    AuthStateChanged = "auth-state-changed",

    /**
     * Instructs the SDK to connect to an injected wallet with the given RDNS, or to disconnect from
     * the current wallet if the RDNS is undefined.
     *
     * The SDK is to answer with {@link Msgs.InjectedWalletConnected} if the connection goes
     * through.
     */
    InjectedWalletRequestConnect = "injected-wallet:requestConnect",

    // --- ProviderBusEventsFromApp ----------------------------------------------------------------

    /** Sends a request that does not require user approval. */
    RequestPermissionless = "request:permissionless",

    /** Sends a request that will be routed through the injected wallet. */
    RequestInjected = "request:injected",

    /** Sent to check if a request requires user approval. */
    PermissionCheckRequest = "permission-check:request",

    /** Injected Response from the InjectedWalletWrapper to the InjectedProviderProxy*/
    ExecuteInjectedResponse = "execute-injected-response",

    // --- ProviderBusEventsFromIframe -------------------------------------------------------------

    /**
     * Response to a request sent by the app. The request was received by the provider bus if it
     * didn't require approval ({@link Msgs.RequestPermissionless}), or from the popup bus
     * ({@link Msgs.PopupApprove}) if it did.
     */
    RequestResponse = "request:response",

    /**
     * Answers a previous "permission-check:request" from the app, telling the app whether a request
     * requires approval.
     */
    PermissionCheckResponse = "permission-check:response",

    /**
     * Sends an EIP-1193 event to the app.
     */
    ProviderEvent = "provider:event",

    /** Injected Request between the InjectedProviderProxy and InjectedWalletWrapper app-side */
    ExecuteInjectedRequest = "execute-injected-request",

    // --- PopupBusEvents --------------------------------------------------------------------------

    /** Informs the iframe that the user has approved a request in the popup. */
    PopupApprove = "popup:approve",

    /** Informs the iframe that the user has rejected a request in the popup. */
    PopupReject = "popup:reject",

    /** Informs the popup that it is time for it to close itself. */
    PopupClose = "popup:close",
}

// =================================================================================================
// === MESSAGE BUS EVENTS FROM APP =================================================================

/**
 * Events sent from the app to the iframe on the general message bus.
 */
export enum WalletDisplayAction {
    /** Navigate to /embed */
    Home = "home-screen",
    /** Navigate to /embed/send */
    Send = "send-screen",
    /** Hide the wallet's interface (no navigation) */
    Closed = "closed",
    /** Show the wallet's interface (no navigation) */
    Open = "open",
}

export type MsgsFromApp = {
    [Msgs.ConnectRequest]: ProviderEventPayload<
        EIP1193RequestParameters<"eth_requestAccounts" | "wallet_requestPermissions">
    >
    [Msgs.InjectedWalletConnected]:
        | {
              rdns: string
              address: `0x${string}`
              request: MsgsFromApp[Msgs.ConnectRequest]
              response: MsgsFromIframe[Msgs.ConnectResponse]["response"]
          }
        | {
              rdns?: undefined
              address?: undefined
              request?: MsgsFromApp[Msgs.ConnectRequest] | undefined
              response?: undefined
          }
    [Msgs.RequestWalletDisplay]: WalletDisplayAction
}

// =================================================================================================
// === MESSAGE BUS EVENTS FROM IFRAME ==============================================================

interface AuthResponse<
    T extends "eth_requestAccounts" | "wallet_requestPermissions" = "eth_requestAccounts" | "wallet_requestPermissions",
> {
    request: ProviderEventPayload<EIP1193RequestParameters<T>>
    response: EIP1193RequestResult<T> | null
}
/**
 * Events sent from the iframe to the app on the general message bus.
 */
export type MsgsFromIframe = {
    [Msgs.IframeInit]: boolean
    [Msgs.ConnectResponse]: AuthResponse
    [Msgs.WalletVisibility]: { isOpen: boolean }
    [Msgs.UserChanged]: HappyUser | undefined
    [Msgs.AuthStateChanged]: AuthState
    [Msgs.InjectedWalletRequestConnect]: { rdns?: string; request: MsgsFromApp[Msgs.ConnectRequest] }
}

// =================================================================================================
// === PROVIDER BUS EVENTS FROM APP ================================================================

/**
 * Schema for messages that can be sent from the app to the iframe.
 */
export type ProviderMsgsFromApp = {
    [Msgs.RequestPermissionless]: ProviderEventPayload<EIP1193RequestParameters>
    [Msgs.RequestInjected]: ProviderEventPayload<EIP1193RequestParameters>
    [Msgs.PermissionCheckRequest]: ProviderEventPayload<EIP1193RequestParameters>
    [Msgs.ExecuteInjectedResponse]: ProviderEventError<EIP1193ErrorObject> | ProviderEventPayload<EIP1193RequestResult>
}

// =================================================================================================
// === PROVIDER BUS EVENTS FROM IFRAME =============================================================

/**
 * Schema for messages that can be sent from the iframe to the app.
 */
export type ProviderEvent = ProviderEventError<EIP1193ErrorObject> | ProviderEventPayload<EIP1193RequestResult>
export type ProviderMsgsFromIframe = {
    [Msgs.RequestResponse]: ProviderEvent
    [Msgs.PermissionCheckResponse]: ProviderEventPayload<boolean> | ProviderEventError
    [Msgs.ExecuteInjectedRequest]: ProviderEventPayload<EIP1193RequestParameters>
    [Msgs.ProviderEvent]: {
        payload: { event: EIP1193EventName; args: unknown }
    }
}

// =================================================================================================
// === POPUP BUS EVENTS ============================================================================

/**
 * Schema for messages that can be sent from the popup to the iframe.
 *
 * This does not require being in the shared package (only used in the iframe package), but it's
 * simpler if all event definitions live in the same place.
 */
export type PopupMsgs = {
    [Msgs.PopupApprove]: ProviderEventPayload<EIP1193RequestParameters>
    [Msgs.PopupReject]: ProviderEventError<EIP1193ErrorObject>
    [Msgs.PopupClose]: { windowId: string; key: string }
}

// =================================================================================================
// === EMPTY EVENTS SCHEMA =========================================================================

/**
 * Empty event schema.
 */
// biome-ignore lint/complexity/noBannedTypes: <explanation>
export type NoEvents = {}
