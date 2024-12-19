import { EventBus, EventBusMode, type ProviderMsgsFromIframe } from "@happychain/sdk-shared"
import type { NoEvents, PopupMsgs, ProviderMsgsFromApp } from "@happychain/sdk-shared"
import type { MsgsFromApp, MsgsFromIframe } from "@happychain/sdk-shared"

/**
 * Iframe side of the app <> iframe provider bus.
 *
 * The app will forward request to the iframe here , and the iframe will send responses back.
 * Some of the requests (those requiring approval) will instead come from the popup bus, but the
 * responses are send through this bus.
 *
 * This side is created first (MessageChannel port1) and will wait for the app side to connect.
 */
export const happyProviderBus = new EventBus<ProviderMsgsFromApp, ProviderMsgsFromIframe>({
    target: window.parent,
    mode: EventBusMode.IframePort,
    scope: "happy-chain-eip1193-provider",
})

/**
 * Iframe side of the app <> iframe general purpose message bus.
 *
 * This will be used to receive UI requests from the app, send auth updates, etc.
 */
export const appMessageBus = new EventBus<MsgsFromApp, MsgsFromIframe>({
    target: window.parent,
    mode: EventBusMode.IframePort,
    scope: "happy-chain-dapp-bus",
})

const popupBus = new EventBus<PopupMsgs>({
    mode: EventBusMode.LocalStorage,
    scope: "server:popup",
})

/**
 * Iframe side of the app <> popup bus.
 * Will be used by the popup to send user approvals/rejections to the iframe.
 *
 * Note that within a single browsers, there could be multiple iframes and multiple popups,
 * hence the messages will identify the originating context (windowId).
 */
export const popupListenBus = popupBus as EventBus<PopupMsgs, NoEvents>

/**
 * Popup side of the app <> popup bus.
 * See {@link popupListenBus} for more details.
 */
// The cast is safe: we won't use this to listen to events.
export const popupEmitBus = popupBus as unknown as EventBus<NoEvents, PopupMsgs>
