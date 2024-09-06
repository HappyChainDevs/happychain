import type { EIP1193RequestParameters, EIP1193RequestResult, ProviderEventPayload } from "@happychain/sdk-shared"
import type { Client } from "viem"

export type MiddlewareType = (
    request: ProviderEventPayload<EIP1193RequestParameters>,
    next: () => Promise<EIP1193RequestResult>,
) => Promise<EIP1193RequestResult>

export type MiddlewareExecutor<TClient extends Client | undefined, TPayload extends EIP1193RequestParameters> = (
    client: TClient,
    data: ProviderEventPayload<TPayload>,
) => Promise<EIP1193RequestResult>
