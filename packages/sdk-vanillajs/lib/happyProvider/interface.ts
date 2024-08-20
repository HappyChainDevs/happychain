<<<<<<< HEAD
import type SafeEventEmitter from "@metamask/safe-event-emitter"
import type { EIP1193RequestFn, EIP1474Methods } from "viem"
||||||| parent of f2638f7 (formatting & dead code elimination)
import type SafeEventEmitter from '@metamask/safe-event-emitter'
import type { EIP1193RequestFn, EIP1474Methods } from 'viem'
=======
import type { config, EIP1193ProxiedEvents, HappyEvents, IEventBus, Logger } from '@happychain/sdk-shared'
import type SafeEventEmitter from '@metamask/safe-event-emitter'
import type { EIP1193RequestFn, EIP1474Methods } from 'viem'
>>>>>>> f2638f7 (formatting & dead code elimination)

<<<<<<< HEAD
import type { EIP1193ProxiedEvents, HappyEvents, IEventBus, Logger, config } from "@happychain/sdk-shared"

export type HappyProviderConfig = Pick<typeof config, "iframePath"> & {
||||||| parent of f2638f7 (formatting & dead code elimination)
import type { EIP1193ProxiedEvents, HappyEvents, IEventBus, Logger, config } from '@happychain/sdk-shared'

export type HappyProviderConfig = Pick<typeof config, 'iframePath'> & {
=======
export type HappyProviderConfig = Pick<typeof config, 'iframePath'> & {
>>>>>>> f2638f7 (formatting & dead code elimination)
    logger?: Logger
    uuid: ReturnType<typeof crypto.randomUUID>
    providerBus: IEventBus<EIP1193ProxiedEvents>
    dappBus: IEventBus<HappyEvents>
}

export interface EIP1193ConnectionHandler extends SafeEventEmitter {
    isConnected(): boolean
    request: EIP1193RequestFn<EIP1474Methods>
}
