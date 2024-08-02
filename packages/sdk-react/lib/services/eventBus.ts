import { type EIP1193ProxiedEvents, EventBus, EventBusChannel, type HappyEvents } from '@happychain/core'

/**
 * Event system between the EIP1193ProviderProxy in the dapp
 * and the iframe provider/executor
 *
 * This is Port2 (dapp side). It registers a global event listener and awaits
 * Port2 to be sent and initialized from Port1 (iframe)
 */
export const eip1193providerBus = new EventBus<EIP1193ProxiedEvents>({
    mode: EventBusChannel.DappPort,
    scope: 'happy-chain-eip1193-provider',
})

/**
 * General purpose message system
 * auth updates, user actions etc
 * between iframe & dapp
 */
export const messageBus = new EventBus<HappyEvents>({
    mode: EventBusChannel.DappPort,
    scope: 'happy-chain-bus',
})
