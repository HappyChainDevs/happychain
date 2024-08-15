import type SafeEventEmitter from '@metamask/safe-event-emitter'
import type { EIP1193RequestFn, EIP1474Methods } from 'viem'

import type { config } from '../../config'
import type { HappyEvents } from '../../interfaces/events'
import type { IEventBus } from '../eventBus'
import type { Logger } from '../logger'

import type { EIP1193ProxiedEvents } from './events'

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
