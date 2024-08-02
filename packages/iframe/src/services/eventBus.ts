import {
    type EIP1193ErrorObject,
    type EIP1193ProxiedEvents,
    type EIP1193RequestResult,
    EventBusChannel,
    EventBus,
    type EventUUID,
    type HappyEvents,
} from '@happychain/core'

/**
 * Event system between the EIP1193ProviderProxy in the dapp
 * and the iframe provider/executor
 *
 * This is port1 so its created and initialized first, then waits for port2 to connect
 */
export const eip1193providerBus = new EventBus<EIP1193ProxiedEvents>({
    target: window.parent,
    mode: EventBusChannel.IframePort,
    scope: 'happy-chain-eip1193-provider',
})

/**
 * General purpose message system
 * auth updates, user actions etc
 * between iframe & dapp
 */
export const messageBus = new EventBus<HappyEvents>({
    target: window.parent,
    mode: EventBusChannel.IframePort,
    scope: 'happy-chain-bus',
})

/**
 * Broadcasts events on same domain
 * Main use case is iframe<->popup communication
 */

export interface BroadcastEvents {
    'request:approve': {
        error: null
        key: EventUUID
        payload: EIP1193RequestResult
    }
    'request:reject': {
        error: EIP1193ErrorObject
        key: EventUUID
        payload: null
    }
}

/**
 * Same domain Messages between iframe & popup
 *
 * primarily user approvals/rejections
 */
export const broadcastBus = new EventBus<BroadcastEvents>({
    mode: EventBusChannel.Broadcast,
    scope: 'server:popup',
})
