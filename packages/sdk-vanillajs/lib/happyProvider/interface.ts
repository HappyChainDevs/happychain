import type { config, EIP1193ProxiedEvents, HappyEvents, IEventBus, Logger } from '@happychain/sdk-shared'
import type SafeEventEmitter from '@metamask/safe-event-emitter'
import type { EIP1193RequestFn, EIP1474Methods } from 'viem'

export type HappyProviderConfig = Pick<typeof config, 'iframePath'> & {
    logger?: Logger
    uuid: ReturnType<typeof crypto.randomUUID>
    providerBus: IEventBus<EIP1193ProxiedEvents>
    dappBus: IEventBus<HappyEvents>
}

export interface EIP1193ConnectionHandler extends SafeEventEmitter {
    isConnected(): boolean
    request: EIP1193RequestFn<EIP1474Methods>
}
