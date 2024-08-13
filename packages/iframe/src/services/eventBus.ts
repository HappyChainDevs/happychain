import {
    type EIP1193ErrorObject,
    type EIP1193ProxiedEvents,
    type EIP1193RequestResult,
    EventBus,
    EventBusChannel,
    type EventUUID,
    type HappyEvents,
} from '@happychain/sdk-shared'

/**
 * Event system between the HappyProvider in the dapp
 * and the iframe provider/executor
 *
 * This is port1 so its created and initialized first, then waits for port2 to connect
 */
export const happyProviderBus = new EventBus<EIP1193ProxiedEvents>({
    target: window.parent,
    mode: EventBusChannel.IframePort,
    scope: 'happy-chain-eip1193-provider',
})

/**
 * General purpose message system
 * auth updates, user actions etc
 * between iframe & dapp
 */
export const dappMessageBus = new EventBus<HappyEvents>({
    target: window.parent,
    mode: EventBusChannel.IframePort,
    scope: 'happy-chain-dapp-bus',
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
export const popupBus = new EventBus<BroadcastEvents>({
    mode: EventBusChannel.Broadcast,
    scope: 'server:popup',
})
