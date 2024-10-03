import type { EventEmitter } from "node:events"
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

/**
 * HappyProvider is a EIP1193 Ethereum Provider {@link https://eips.ethereum.org/EIPS/eip-1193}
 *
 * @example
 * ### Setting up viem client
 * ```ts twoslash
 * import { createPublicClient, custom } from 'viem'
 * import { happyProvider } from '@happychain/js'
 * // ---cut---
 * const publicClient = createPublicClient({
 *   transport: custom(happyProvider)
 * })
 * ```
 */
export interface HappyProviderPublic extends EventEmitter {
    /**
     * Makes an EIP-1193 request and returns the response.
     *
     * If you are using Viem, the actual type signature for this method is reproduced below,
     * so you can use it to validate the parameter types. Most people won't need this and will
     * use libraires like Viem or Ethers to handle communication with the provider.
     *
     * ```ts twoslash
     * let request: <TString extends EIP1193RequestMethods = EIP1193RequestMethods>(
     *     args: EIP1193RequestParameters<TString>,
     * ) => Promise<EIP1193RequestResult<TString>>
     * ```
     */
    // biome-ignore lint/suspicious/noExplicitAny: let's not export all of Viem's types
    request: (args: any) => Promise<any>
}

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
