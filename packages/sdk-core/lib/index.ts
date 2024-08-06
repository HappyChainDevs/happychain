import { config } from './config'
import type { HappyEvents } from './interfaces/events'
import type { HappyUser } from './interfaces/happyUser'
import type { EIP1193ProxiedEvents } from './services/eip1193ProviderProxy'
import { EIP1193ProviderProxy } from './services/eip1193ProviderProxy'
import { EventBus, EventBusChannel } from './services/eventBus'

export { config }

export * from './interfaces/eip1193Provider'
export * from './interfaces/events'
export * from './interfaces/happyUser'

export * from './services/eip1193ProviderProxy'
export * from './services/eventBus'
export * from './services/logger'

function registerDappCallbacks(bus: EventBus<HappyEvents>) {
    const onUserUpdateCallbacks = new Set<(user: HappyUser | null) => void>()
    function onUserUpdate(callback: (user: HappyUser | null) => void) {
        onUserUpdateCallbacks.add(callback)
    }
    bus.on('auth-changed', (user) => {
        for (const call of onUserUpdateCallbacks) {
            call(user)
        }
    })

    const onModalUpdateCallbacks = new Set<(isOpen: boolean) => void>()
    function onModalUpdate(callback: (isOpen: boolean) => void) {
        onModalUpdateCallbacks.add(callback)
    }
    bus.on('modal-toggle', (isOpen) => {
        for (const call of onModalUpdateCallbacks) {
            call(isOpen)
        }
    })

    return { onUserUpdate, onModalUpdate }
}

function setup() {
    const dappMessageBus = new EventBus<HappyEvents>({
        mode: EventBusChannel.DappPort,
        scope: 'happy-chain-bus',
    })

    const eip1193Provider = new EIP1193ProviderProxy({
        iframePath: config.iframePath,

        providerBus: new EventBus<EIP1193ProxiedEvents>({
            mode: EventBusChannel.DappPort,
            scope: 'happy-chain-eip1193-provider',
        }),

        dappBus: dappMessageBus,
    })

    return { eip1193Provider, dappMessageBus }
}

const { eip1193Provider, dappMessageBus } = setup()

export const { onUserUpdate, onModalUpdate } = registerDappCallbacks(dappMessageBus)
export { eip1193Provider }
