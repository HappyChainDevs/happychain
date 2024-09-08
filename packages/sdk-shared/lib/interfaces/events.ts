import type { AssertAssignableTo } from "@happychain/common"
import type { EventSchema } from "../services/eventBus"
import type {
    EIP1193EventName,
    EIP1193PermissionsRequest,
    EIP1193RequestParameters,
    EIP1193RequestResult,
} from "./eip1193.ts"
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

    /** Instructs the iframe to display the connection modal. */
    RequestDisplay = "request-display",

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
    ModalToggle = "modal-toggle",

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

    /** Sent to check if a request requires user approval. */
    PermissionCheckRequest = "permission-check:request",

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

    // --- PopupBusEvents --------------------------------------------------------------------------

    /** Informs the iframe that the user has approved a request in the popup. */
    PopupApprove = "popup:approve",

    /** Informs the iframe that the user has rejected a request in the popup. */
    PopupReject = "popup:reject",
}

// =================================================================================================
// === MESSAGE BUS EVENTS FROM APP =================================================================

/**
 * Events sent from the app to the iframe on the general message bus.
 */
export type MsgsFromApp = {
    [Msgs.RequestDisplay]: "login-modal"
    [Msgs.InjectedWalletConnected]: { rdns: string; address: `0x${string}` } | { rdns?: undefined; address?: undefined }
    [Msgs.MirrorPermissions]: {
        request: EIP1193PermissionsRequest
        response: unknown
    }
}
type _assert1 = AssertAssignableTo<MsgsFromApp, EventSchema<MsgsFromApp>>

// =================================================================================================
// === MESSAGE BUS EVENTS FROM IFRAME ==============================================================

/**
 * Events sent from the iframe to the app on the general message bus.
 */
export type MsgsFromIframe = {
    [Msgs.IframeInit]: boolean
    [Msgs.ModalToggle]: boolean
    [Msgs.UserChanged]: HappyUser | undefined
    [Msgs.AuthStateChanged]: AuthState
    [Msgs.InjectedWalletRequestConnect]: { rdns?: string }
}
type _assert2 = AssertAssignableTo<MsgsFromIframe, EventSchema<MsgsFromIframe>>

// =================================================================================================
// === PROVIDER BUS EVENTS FROM APP ================================================================

/**
 * Schema for messages that can be sent from the app to the iframe.
 */
export type ProviderMsgsFromApp = {
    [Msgs.RequestPermissionless]: ProviderEventPayload<EIP1193RequestParameters>
    [Msgs.PermissionCheckRequest]: ProviderEventPayload<EIP1193RequestParameters>
}
type _assert3 = AssertAssignableTo<ProviderMsgsFromApp, EventSchema<ProviderMsgsFromApp>>

// =================================================================================================
// === PROVIDER BUS EVENTS FROM IFRAME =============================================================

/**
 * Schema for messages that can be sent from the iframe to the app.
 */
export type PopupMsgsFromIframe = {
    [Msgs.RequestResponse]: ProviderEventError<EIP1193ErrorObject> | ProviderEventPayload<EIP1193RequestResult>
    [Msgs.PermissionCheckResponse]: ProviderEventPayload<boolean> | ProviderEventError
    [Msgs.ProviderEvent]: {
        payload: { event: EIP1193EventName; args: unknown }
    }
}
type _assert4 = AssertAssignableTo<PopupMsgsFromIframe, EventSchema<PopupMsgsFromIframe>>

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
}
type _assert5 = AssertAssignableTo<PopupMsgs, EventSchema<PopupMsgs>>

// =================================================================================================
// === EMPTY EVENTS SCHEMA =========================================================================

/**
 * Empty event schema.
 */
// biome-ignore lint/complexity/noBannedTypes: <explanation>
export type NoEvents = {}
type _assert6 = AssertAssignableTo<NoEvents, EventSchema<NoEvents>>
