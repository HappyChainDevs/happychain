import { type EIP1193ProxiedEvents, eventBus, EventBusChannel, type HappyEvents } from '@happychain/core'

export const eip1193providerBus = eventBus<EIP1193ProxiedEvents>({
    mode: EventBusChannel.Port2,
    scope: 'happy-chain-eip1193-provider',
})

export const messageBus = eventBus<HappyEvents>({
    mode: EventBusChannel.Port2,
    scope: 'happy-chain-bus',
})
