import { config } from "./config"
import type { HappyEvents } from "./interfaces/events"
import type { HappyUser } from "./interfaces/happyUser"
import { type EIP1193ProxiedEvents, HappyProvider } from "./services/eip1193ProviderProxy"
import { EventBus, EventBusChannel } from "./services/eventBus"

export const uuid = crypto.randomUUID()

const dappMessageBus = new EventBus<HappyEvents>({
    mode: EventBusChannel.DappPort,
    scope: "happy-chain-dapp-bus",
})

const onUserUpdateCallbacks = new Set<(user?: HappyUser) => void>()
const onModalUpdateCallbacks = new Set<(isOpen: boolean) => void>()

dappMessageBus.on("auth-changed", (user) => {
    for (const call of onUserUpdateCallbacks) {
        call(user)
    }
})
dappMessageBus.on("modal-toggle", (isOpen) => {
    for (const call of onModalUpdateCallbacks) {
        call(isOpen)
    }
})

export type UserUpdateCallback = (user?: HappyUser) => void
/**
 *
 * @example
 * ```ts twoslash
 * import { onUserUpdate } from '@happychain/js'
 *
 * // [!include ~/snippets/listeners.ts:onUserUpdate]
 *```
 *
 * @param callback
 * @returns
 */
export const onUserUpdate = (callback: UserUpdateCallback) => {
    onUserUpdateCallbacks.add(callback)
    return () => {
        onUserUpdateCallbacks.delete(callback)
    }
}

export type ModalUpdateCallback = (isOpen: boolean) => void

export const onModalUpdate = (callback: ModalUpdateCallback) => {
    onModalUpdateCallbacks.add(callback)
    return () => {
        onModalUpdateCallbacks.delete(callback)
    }
}
export const happyProvider = new HappyProvider({
    iframePath: config.iframePath,

    uuid,

    providerBus: new EventBus<EIP1193ProxiedEvents>({
        mode: EventBusChannel.DappPort,
        scope: "happy-chain-eip1193-provider",
    }),

    dappBus: dappMessageBus,
})
