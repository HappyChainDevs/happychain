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
 * Names of types of messages that can be sent on the general message bus.
 */
export enum Messages {
    // --- EventsFromApp ---------------------------------------------------------------------------

    /** Instructs the iframe to display the connection modal. */
    RequestDisplay = "request-display",

    /** Informs the iframe that the user has connected/disconnected to/from an injected wallet. */
    InjectedWalletConnect = "injected-wallet:connect",

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
    AuthChanged = "auth-changed",

    /** Informs the SDK of the current social authentication state of the user. */
    AuthState = "auth-state",

    /**
     * Instructs the SDK to connect to an injected wallet with the given RDNS, or to disconnect from
     * the current wallet if the RDNS is undefined.
     */
    InjectedWalletRequestConnect = "injected-wallet:requestConnect",

    // --- ProviderBusEventsFromApp ----------------------------------------------------------------

    /** Sends a request that does not require user approval. */
    RequestApprove = "request:approve",

    /** Sent to check if a request requires user approval. */
    PermissionCheckRequest = "permission-check:request",

    // --- ProviderBusEventsFromIframe -------------------------------------------------------------

    /**
     * Response to a request sent by the app. The request was received by the provider bus
     * ("request:approve") if it didn't require approval, or from the popup bus ("request:approve")
     * if it did.
     */
    ResponseComplete = "response:complete",

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
    PopupApprove = "request:approve",

    /** Informs the iframe that the user has rejected a request in the popup. */
    PopupReject = "request:reject",
}

// =================================================================================================
// === MESSAGE BUS EVENTS FROM APP =================================================================

/**
 * Events sent from the app to the iframe on the general message bus.
 */
export type EventsFromApp = {
    [Messages.RequestDisplay]: "login-modal"
    [Messages.InjectedWalletConnect]:
        | { rdns: string; address: `0x${string}` }
        | { rdns?: undefined; address?: undefined }
    [Messages.MirrorPermissions]: {
        request: EIP1193PermissionsRequest
        response: unknown
    }
}
type _assert1 = AssertAssignableTo<EventsFromApp, EventSchema<EventsFromApp>>

// =================================================================================================
// === MESSAGE BUS EVENTS FROM IFRAME ==============================================================

/**
 * Events sent from the iframe to the app on the general message bus.
 */
export type EventsFromIframe = {
    [Messages.IframeInit]: boolean
    [Messages.ModalToggle]: boolean
    [Messages.AuthChanged]: HappyUser | undefined
    [Messages.AuthState]: AuthState
    [Messages.InjectedWalletRequestConnect]: { rdns?: string }
}
type _assert2 = AssertAssignableTo<EventsFromIframe, EventSchema<EventsFromIframe>>

// =================================================================================================
// === PROVIDER BUS EVENTS FROM APP ================================================================

/**
 * Schema for messages that can be sent from the app to the iframe.
 */
export type ProviderBusEventsFromApp = {
    [Messages.RequestApprove]: ProviderEventPayload<EIP1193RequestParameters>
    [Messages.PermissionCheckRequest]: ProviderEventPayload<EIP1193RequestParameters>
}
type _assert3 = AssertAssignableTo<ProviderBusEventsFromApp, EventSchema<ProviderBusEventsFromApp>>

// =================================================================================================
// === PROVIDER BUS EVENTS FROM IFRAME =============================================================

/**
 * Schema for messages that can be sent from the iframe to the app.
 */
export type ProviderBusEventsFromIframe = {
    [Messages.ResponseComplete]: ProviderEventError<EIP1193ErrorObject> | ProviderEventPayload<EIP1193RequestResult>
    [Messages.PermissionCheckResponse]: ProviderEventPayload<boolean> | ProviderEventError
    [Messages.ProviderEvent]: {
        payload: { event: EIP1193EventName; args: unknown }
    }
}
type _assert4 = AssertAssignableTo<ProviderBusEventsFromIframe, EventSchema<ProviderBusEventsFromIframe>>

// =================================================================================================
// === POPUP BUS EVENTS ============================================================================

/**
 * Schema for messages that can be sent from the popup to the iframe.
 *
 * This does not require being in the shared package (only used in the iframe package), but it's
 * simpler if all event definitions live in the same place.
 */
export type PopupBusEvents = {
    [Messages.PopupApprove]: ProviderEventPayload<EIP1193RequestParameters>
    [Messages.PopupReject]: ProviderEventError<EIP1193ErrorObject>
}
type _assert5 = AssertAssignableTo<PopupBusEvents, EventSchema<PopupBusEvents>>

// =================================================================================================
// === EMPTY EVENTS SCHEMA =========================================================================

/**
 * Empty event schema.
 */
// biome-ignore lint/complexity/noBannedTypes: <explanation>
export type NoEvents = {}
type _assert6 = AssertAssignableTo<NoEvents, EventSchema<NoEvents>>
