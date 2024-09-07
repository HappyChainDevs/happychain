import type {
    EIP1193EventName,
    EIP1193RequestParameters,
    EIP1193RequestResult,
    ProviderEventError,
    ProviderEventPayload,
} from "../../interfaces/eip1193Provider"
import type { EventSchema } from "../eventBus"

import type { EIP1193ErrorObject } from "./errors"

import type { AssertAssignableTo } from "@happychain/common"

/**
 * Schema for messages that can be sent from the app to the iframe.
 */
export type ProviderBusEventsFromApp = {
    /** Sends a request that does not require user approval. */
    "request:approve": ProviderEventPayload<EIP1193RequestParameters>

    /** Sent to check if a request requires user approval. */
    "permission-check:request": ProviderEventPayload<EIP1193RequestParameters>
}
type _assert1 = AssertAssignableTo<ProviderBusEventsFromApp, EventSchema<ProviderBusEventsFromApp>>

/**
 * Schema for messages that can be sent from the iframe to the app.
 */
export type ProviderBusEventsFromIframe = {
    /**
     * Response to a request sent by the app. The request was received by the provider bus
     * ("request:approve") if it didn't require approval, or from the popup bus ("request:approve")
     * if it did.
     */
    "response:complete": ProviderEventError<EIP1193ErrorObject> | ProviderEventPayload<EIP1193RequestResult>

    /**
     * Answers a previous "permission-check:request" from the app, telling the app whether a request
     * requires approval.
     */
    "permission-check:response": ProviderEventPayload<boolean> | ProviderEventError<unknown>

    // eip1193 events proxy
    "provider:event": {
        payload: { event: EIP1193EventName; args: unknown }
    }
}
type _assert2 = AssertAssignableTo<ProviderBusEventsFromIframe, EventSchema<ProviderBusEventsFromIframe>>

/**
 * Schema for messages that can be sent from the popup to the iframe.
 *
 * This does not require being in the shared package (only used in the iframe package), but it's
 * simpler if all event definitions live in the same place.
 */
export type PopupBusEvents = {
    /** Informs the iframe that the user has approved a request in the popup. */
    "request:approve": ProviderEventPayload<EIP1193RequestParameters>

    /** Informs the iframe that the user has rejected a request in the popup. */
    "request:reject": ProviderEventError<EIP1193ErrorObject>
}
type _assert3 = AssertAssignableTo<PopupBusEvents, EventSchema<PopupBusEvents>>

/**
 * Empty event schema.
 */
// biome-ignore lint/complexity/noBannedTypes: <explanation>
export type NoEvents = {}
type _assert4 = AssertAssignableTo<NoEvents, EventSchema<NoEvents>>
