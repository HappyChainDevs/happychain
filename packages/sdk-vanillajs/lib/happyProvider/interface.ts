import type {
    EIP1193RequestMethods,
    EIP1193RequestParameters,
    EIP1193RequestResult,
    EventBus,
    Logger,
    MsgsFromApp,
    MsgsFromIframe,
    ProviderMsgsFromApp,
    ProviderMsgsFromIframe,
    config,
} from "@happychain/sdk-shared"
import type { UUID } from "../common-utils"

/** @internal */
export type HappyProviderConfig = Pick<typeof config, "iframePath"> & {
    logger?: Logger
    windowId: UUID
    providerBus: EventBus<ProviderMsgsFromIframe, ProviderMsgsFromApp>
    msgBus: EventBus<MsgsFromIframe, MsgsFromApp>
}

export interface EIP1193ConnectionHandler extends SafeEventEmitter {
    isConnected(): boolean
    request<TString extends EIP1193RequestMethods = EIP1193RequestMethods>(
        args: EIP1193RequestParameters<TString>,
    ): Promise<EIP1193RequestResult<TString>>
}
