import type { HappyEvents } from './interfaces/events'
import type { HappyUser } from './interfaces/happyUser'
import { type EIP1193ProxiedEvents, HappyProvider } from './services/eip1193ProviderProxy'
import { EventBus, EventBusChannel } from './services/eventBus'
import { config } from './config'

const dappMessageBus = new EventBus<HappyEvents>({
    mode: EventBusChannel.DappPort,
    scope: 'happy-chain-dapp-bus',
})

const onUserUpdateCallbacks = new Set<(user: HappyUser | null) => void>()
const onModalUpdateCallbacks = new Set<(isOpen: boolean) => void>()

dappMessageBus.on('auth-changed', (user) => {
    for (const call of onUserUpdateCallbacks) {
        call(user)
    }
})
dappMessageBus.on('modal-toggle', (isOpen) => {
    for (const call of onModalUpdateCallbacks) {
        call(isOpen)
    }
})

export const onUserUpdate = (callback: (user: HappyUser | null) => void) => {
    onUserUpdateCallbacks.add(callback)
    return () => {
        onUserUpdateCallbacks.delete(callback)
    }
}
export const onModalUpdate = (callback: (isOpen: boolean) => void) => {
    onModalUpdateCallbacks.add(callback)
    return () => {
        onModalUpdateCallbacks.delete(callback)
    }
}
export const happyProvider = new HappyProvider({
    iframePath: config.iframePath,

    providerBus: new EventBus<EIP1193ProxiedEvents>({
        mode: EventBusChannel.DappPort,
        scope: 'happy-chain-eip1193-provider',
    }),

    dappBus: dappMessageBus,
})
