import type {
    EIP1193ProxiedEvents,
    EIP1193RequestMethods,
    EIP1193RequestParameters,
    EIP1193RequestResult,
    HappyEvents,
    IEventBus,
    Logger,
    config,
} from "@happychain/sdk-shared"
import type { UUID } from "@happychain/sdk-shared"
import type SafeEventEmitter from "@metamask/safe-event-emitter"

/** @internal */
export type HappyProviderConfig = Pick<typeof config, "iframePath"> & {
    logger?: Logger
    windowId: UUID
    providerBus: IEventBus<EIP1193ProxiedEvents>
    dappBus: IEventBus<HappyEvents>
}

export interface EIP1193ConnectionHandler extends SafeEventEmitter {
    isConnected(): boolean
    request<TString extends EIP1193RequestMethods = EIP1193RequestMethods>(
        args: EIP1193RequestParameters<TString>,
    ): Promise<EIP1193RequestResult<TString>>
}
