import { EventBus, EventBusMode, type ProviderMsgsFromWallet } from "@happy.tech/wallet-common"
import type { ProviderMsgsFromApp } from "@happy.tech/wallet-common"
import type { MsgsFromApp, MsgsFromWallet } from "@happy.tech/wallet-common"

/**
 * Iframe side of the app <> iframe provider bus.
 *
 * The app will forward request to the iframe here , and the iframe will send responses back.
 * Some of the requests (those requiring approval) will instead come from the popup bus, but the
 * responses are send through this bus.
 *
 * This side is created first (MessageChannel port1) and will wait for the app side to connect.
 */
export const happyProviderBus = new EventBus<ProviderMsgsFromApp, ProviderMsgsFromWallet>({
    target: window.parent,
    mode: EventBusMode.IframePort,
    scope: "happy-chain-eip1193-provider",
})

/**
 * Iframe side of the app <> iframe general purpose message bus.
 *
 * This will be used to receive UI requests from the app, send auth updates, etc.
 */
export const appMessageBus = new EventBus<MsgsFromApp, MsgsFromWallet>({
    target: window.parent,
    mode: EventBusMode.IframePort,
    scope: "happy-chain-dapp-bus",
})
