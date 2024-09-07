import { EventBus, EventBusMode, type HappyEvents, type ProviderBusEventsFromIframe } from "@happychain/sdk-shared"
import type { NoEvents, PopupBusEvents, ProviderBusEventsFromApp } from "@happychain/sdk-shared"

/**
 * Iframe side of the app <> iframe provider bus.
 *
 * The app will forward request to the iframe here , and the iframe will send responses back.
 * Some of the requests (those requiring approval) will instead come from the popup bus, but the
 * responses are send throug this bus.
 *
 * This side is created first (MessageChannel port1) and will wait for the app side to connect.
 */
export const happyProviderBus = new EventBus<ProviderBusEventsFromApp, ProviderBusEventsFromIframe>({
    target: window.parent,
    mode: EventBusMode.IframePort,
    scope: "happy-chain-eip1193-provider",
})

/**
 * Iframe side of the app <> iframe general purpose message bus.
 *
 * This will be used to receive UI requests from the app, send auth updates, etc.
 */
export const appMessageBus = new EventBus<HappyEvents, HappyEvents>({
    target: window.parent,
    mode: EventBusMode.IframePort,
    scope: "happy-chain-dapp-bus",
})

/**
 * Iframe side of the app <> popup bus.
 * Will be used by the popup to send user approvals/rejections to the iframe.
 *
 * Note that within a single browsers, there could be multiple iframes and multiple popups,
 * hence the messages will identify the originating context (windowId).
 */
export const popupBus = new EventBus<PopupBusEvents, NoEvents>({
    mode: EventBusMode.Broadcast,
    scope: "server:popup",
})
