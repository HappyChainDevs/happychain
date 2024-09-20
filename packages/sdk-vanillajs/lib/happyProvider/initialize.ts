import type {
    HappyUser,
    MsgsFromApp,
    MsgsFromIframe,
    PopupMsgsFromIframe,
    ProviderMsgsFromApp,
} from "@happychain/sdk-shared"
import { EventBus, EventBusMode, config, createUUID } from "@happychain/sdk-shared"
import type { EIP1193Provider } from "viem"

import { ModalStates, Msgs } from "@happychain/sdk-shared/lib/interfaces/events"
import { announceProvider } from "mipd"
import { HappyProvider } from "./happyProvider"
import { icon64x64 } from "./icons"
import { registerListeners } from "./listeners"

/**
 * Unique Window UUID
 *
 * @internal
 */
export const windowId = createUUID()

/**
 * App side of the app <> iframe general purpose message bus.
 *
 * This will be used to send UI requests to the iframe, receive auth updates, etc.
 */
const iframeMessageBus = new EventBus<MsgsFromIframe, MsgsFromApp>({
    mode: EventBusMode.AppPort,
    scope: "happy-chain-dapp-bus",
})

export const { onUserUpdate, onModalUpdate, onAuthStateUpdate, onIframeInit } = registerListeners(iframeMessageBus)

let iframeReady = false

onIframeInit((ready: boolean) => {
    iframeReady = ready
})

let user: HappyUser | undefined

onUserUpdate((_user?: HappyUser) => {
    user = _user
})

/**
 * @returns The user currently connected to the app, if any.
 *
 * @example
 * ```ts twoslash
 * import { getCurrentUser } from '@happychain/js'
 * // ---cut---
 * const user = getCurrentUser()
 * ```
 */
export const getCurrentUser = () => {
    if (!iframeReady) {
        console.warn("getCurrentUser was called before happychain-sdk was ready. result will be empty")
    }
    return user
}

/**
 * This is an {@link https://eips.ethereum.org/EIPS/eip-1193 | EIP1193 Ethereum Provider}
 * and is an initialized instance of {@link HappyProvider}.
 */
export const happyProvider = new HappyProvider({
    iframePath: config.iframePath,

    windowId: windowId,

    providerBus: new EventBus<PopupMsgsFromIframe, ProviderMsgsFromApp>({
        mode: EventBusMode.AppPort,
        scope: "happy-chain-eip1193-provider",
    }),
    msgBus: iframeMessageBus,
    // Cast to EIP1193 provider for compatibility with Viem/Wagmi.
    // In practice the 'request' functions are compatible, but the types don't line up for now.
}) as HappyProvider & EIP1193Provider

/**
 * Connect the app to the Happy Account (will prompt user for permission).
 */
export const connect = async () => {
    return await happyProvider.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
    })
}

/**
 * Disconnect the app from the Happy Account.
 */
export const disconnect = async () => {
    return await happyProvider.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
    })
}

export const unsubscribe = announceProvider({
    info: {
        icon: icon64x64,
        name: "HappyWallet",
        rdns: "tech.happy",
        uuid: createUUID(),
    },
    provider: happyProvider,
})

export const showSendScreen = () => {
    iframeMessageBus.emit(Msgs.RequestDisplay, ModalStates.Send)
}
