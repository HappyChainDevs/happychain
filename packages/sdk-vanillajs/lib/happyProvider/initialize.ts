import type { EIP1193ProxiedEvents, HappyEvents } from '@happychain/sdk-shared'
import { EventBus, EventBusChannel, config } from '@happychain/sdk-shared'
import { HappyProvider } from './happyProvider'
import { registerListeners } from './listeners'

export const uuid = crypto.randomUUID()

const dappMessageBus = new EventBus<HappyEvents>({
    mode: EventBusChannel.DappPort,
    scope: 'happy-chain-dapp-bus',
})

export const { onUserUpdate, onModalUpdate } = registerListeners(dappMessageBus)

export const happyProvider = new HappyProvider({
    iframePath: config.iframePath,

    uuid,

    providerBus: new EventBus<EIP1193ProxiedEvents>({
        mode: EventBusChannel.DappPort,
        scope: 'happy-chain-eip1193-provider',
    }),

    dappBus: dappMessageBus,
})
