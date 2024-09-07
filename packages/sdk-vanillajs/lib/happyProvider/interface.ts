import type {
    EIP1193ProxiedEvents,
    EIP1193RequestMethods,
    EIP1193RequestParameters,
    EIP1193RequestResult,
    EventBus,
    HappyEvents,
    Logger,
    config,
} from "@happychain/sdk-shared"
import type { UUID } from "@happychain/sdk-shared"
import type SafeEventEmitter from "@metamask/safe-event-emitter"

/** @internal */
export type HappyProviderConfig = Pick<typeof config, "iframePath"> & {
    logger?: Logger
    windowId: UUID
    providerBus: EventBus<EIP1193ProxiedEvents>
    dappBus: EventBus<HappyEvents>
}

export interface EIP1193ConnectionHandler extends SafeEventEmitter {
    isConnected(): boolean
    request<TString extends EIP1193RequestMethods = EIP1193RequestMethods>(
        args: EIP1193RequestParameters<TString>,
    ): Promise<EIP1193RequestResult<TString>>
}
