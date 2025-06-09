import type { OverlayErrorCode, SerializedRpcError } from "../errors"
import type { SimulateSuccess } from "./boop"
import type { EIP1193EventName, EIP1193RequestMethods, EIP1193RequestParameters, EIP1193RequestResult } from "./eip1193"
import type { EIP6963ProviderInfo } from "./eip6963"
import type { AuthState, HappyUser } from "./happyUser"
import type { ProviderEventError, ProviderEventPayload } from "./payloads"

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

    /** Announces injected wallets to the iframe following EIP-6963 'detail.info' format. */
    AnnounceInjectedProvider = "announce-injected-provider",

    /**
     * Informs the iframe to request the overlay to display an error message.
     * When the iframe receives this, it emits {@link Msgs.DisplayOverlayError}
     * back to the app to display the overlay.
     */
    SetOverlayError = "set-overlay-error",

    // --- EventsFromIframe ------------------------------------------------------------------------

    /** Informs the SDK that the wallet has loaded and initialized. */
    WalletInit = "wallet-init",

    /** When sent from the iframe, this is received by the app and the overlay is displayed. */
    DisplayOverlayError = "display-overlay-error",

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

    /** Forwards an event form the connected injected wallet to the iframe. */
    ForwardInjectedEvent = "forward-injected-event",

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

    /** Signals the user needs to be sent to the popup */
    RequestCurrentUser = "popup:request-current-user",
    RespondCurrentUser = "popup:respond-current-user",
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
    // We don't supply the provider — it is not serializable. Instead, the iframe will send
    // {@link Msgs.InjectedWalletRequestConnect} to request that the app connects to a given injected wallet.
    [Msgs.AnnounceInjectedProvider]: { info: EIP6963ProviderInfo; provider?: never }
    [Msgs.ConnectRequest]: ProviderEventPayload<
        EIP1193RequestParameters<"eth_accounts" | "eth_requestAccounts" | "wallet_requestPermissions">
    >
    [Msgs.InjectedWalletConnected]:
        | {
              // standard connection request
              rdns: string
              address: `0x${string}`
              request: MsgsFromApp[Msgs.ConnectRequest]
              response: MsgsFromWallet[Msgs.ConnectResponse]["response"]
          }
        | {
              // everything undefined means a disconnect
              rdns?: undefined
              address?: undefined
              request?: MsgsFromApp[Msgs.ConnectRequest] | undefined
              response?: undefined
          }
    [Msgs.RequestWalletDisplay]: WalletDisplayAction
    [Msgs.SetOverlayError]: OverlayErrorCode
}

// =================================================================================================
// === MESSAGE BUS EVENTS FROM IFRAME ==============================================================

interface AuthResponse<
    T extends "eth_accounts" | "eth_requestAccounts" | "wallet_requestPermissions" =
        | "eth_accounts"
        | "eth_requestAccounts"
        | "wallet_requestPermissions",
> {
    request: ProviderEventPayload<EIP1193RequestParameters<T>>
    response: EIP1193RequestResult<T> | null
}
/**
 * Events sent from the wallet to the app on the general message bus.
 */
export type MsgsFromWallet = {
    [Msgs.WalletInit]: boolean
    [Msgs.DisplayOverlayError]: OverlayErrorCode
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
    [Msgs.ForwardInjectedEvent]: ProviderEventPayload<{ event: string; params: unknown }>
    [Msgs.RequestPermissionless]: ProviderEventPayload<EIP1193RequestParameters>
    [Msgs.RequestInjected]: ProviderEventPayload<EIP1193RequestParameters>
    [Msgs.PermissionCheckRequest]: ProviderEventPayload<EIP1193RequestParameters>
    [Msgs.ExecuteInjectedResponse]: ProviderEventError<SerializedRpcError> | ProviderEventPayload<EIP1193RequestResult>
}

// =================================================================================================
// === PROVIDER BUS EVENTS FROM IFRAME =============================================================

/**
 * Schema for messages that can be sent from the iframe to the app.
 */
export type ProviderEvent = ProviderEventError<SerializedRpcError> | ProviderEventPayload<EIP1193RequestResult>
export type ProviderMsgsFromWallet = {
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
 * Maps EIP1193 method names to their corresponding return type definitions.
 */

type RequestExtraDataTypeMap = {
    eth_sendTransaction: SimulateSuccess
    wallet_sendTransaction: SimulateSuccess
}

/**
 * Provides type-safe method-specific extra data for EIP1193 requests.
 * Returns {@link RequestExtraDataTypeMap} type if method exists, otherwise empty record.
 * @template Method - EIP1193 method name
 */
export type RequestExtraData<Method extends EIP1193RequestMethods> = Method extends keyof RequestExtraDataTypeMap
    ? RequestExtraDataTypeMap[Method]
    : undefined

/**
 * Payload structure for approved EIP1193 requests.
 * Combines required EIP1193 parameters with optional method-specific extra data.
 */
export type ApprovedRequestPayload<Method extends EIP1193RequestMethods = EIP1193RequestMethods> =
    EIP1193RequestParameters<Method> & {
        extraData?: RequestExtraData<Method>
    }

/**
 * Schema for messages that can be sent from the popup to the iframe.
 *
 * This does not require being in the shared package (only used in the iframe package), but it's
 * simpler if all event definitions live in the same place.
 */
export type PopupMsgs = {
    [Msgs.PopupApprove]: ProviderEventPayload<ApprovedRequestPayload>
    [Msgs.PopupReject]: ProviderEventError<SerializedRpcError>
    [Msgs.RequestCurrentUser]: ProviderEventPayload<null>
}
