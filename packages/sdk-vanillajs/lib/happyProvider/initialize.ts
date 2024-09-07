import type {
    EIP1193Provider,
    HappyEvents,
    HappyUser,
    ProviderBusEventsFromApp,
    ProviderBusEventsFromIframe,
} from "@happychain/sdk-shared"
import { EventBus, EventBusMode, config, createUUID } from "@happychain/sdk-shared"

import { HappyProvider } from "./happyProvider"
import { registerListeners } from "./listeners"

/**
 * Unique Window UUID
 *
 * @internal
 */
export const windowId = createUUID()

const dappMessageBus = new EventBus<HappyEvents>({
    mode: EventBusMode.AppPort,
    scope: "happy-chain-dapp-bus",
})

export const { onUserUpdate, onModalUpdate, onAuthStateUpdate, onIframeInit } = registerListeners(dappMessageBus)

let iframeReady = false

onIframeInit((ready: boolean) => {
    iframeReady = ready
})

let user: HappyUser | undefined

onUserUpdate((_user?: HappyUser) => {
    user = _user
})

/**
 * Current Active HappyUser
 *
 * {@link HappyUser}
 * @returns currently connected HappyUser, or undefined
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
 * `happyProvider` is an {@link https://eips.ethereum.org/EIPS/eip-1193 | EIP1193 Ethereum Provider}
 * and is an initialized instance of {@link HappyProvider}
 */
export const happyProvider = new HappyProvider({
    iframePath: config.iframePath,

    windowId: windowId,

    providerBus: new EventBus<ProviderBusEventsFromIframe, ProviderBusEventsFromApp>({
        mode: EventBusMode.AppPort,
        scope: "happy-chain-eip1193-provider",
    }),
    appBus: dappMessageBus,
}) as HappyProvider & EIP1193Provider

export async function connect() {
    return await happyProvider.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
    })
}

export async function disconnect() {
    return await happyProvider.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
    })
}
