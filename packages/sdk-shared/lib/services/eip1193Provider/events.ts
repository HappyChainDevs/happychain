import type {
    EIP1193EventMap,
    EIP1193Parameters,
    EIP1193RequestFn,
    EIP1474Methods,
    RpcSchema,
    RpcSchemaOverride,
} from "viem"

import type { EIP1193ErrorObject } from "./errors"

// pulled from Viem internals
type DerivedRpcSchema<
    rpcSchema extends RpcSchema | undefined,
    rpcSchemaOverride extends RpcSchemaOverride | undefined,
> = rpcSchemaOverride extends RpcSchemaOverride ? [rpcSchemaOverride & { Method: string }] : rpcSchema

export type EventUUID = ReturnType<typeof crypto.randomUUID>
export type EIP1193RequestArg = Parameters<EIP1193RequestFn>[0]

export type EIP1193RequestResult<TParams extends EIP1193RequestArg = EIP1193RequestArg> = DerivedRpcSchema<
    EIP1474Methods,
    undefined
> extends RpcSchema
    ? Extract<DerivedRpcSchema<EIP1474Methods, undefined>[number], { Method: TParams["method"] }>["ReturnType"]
    : unknown

export type EIP1193EventName<T extends string = keyof EIP1193EventMap> = T

export type ProviderEventPayload<T = unknown> = {
    // request event unique key
    key: EventUUID
    // window identifier
    uuid: ReturnType<typeof crypto.randomUUID>
    error: null
    payload: T
}

export type ProviderEventError<T = unknown> = {
    // request event unique key
    key: EventUUID
    // window identifier
    uuid: ReturnType<typeof crypto.randomUUID>
    error: T
    payload: null
}

/**
 * Naming Convention:
 * 'request:' => these are user JSON-RPC requests and are sent from the dapp (providerProxy) to the iframe
 *
 * 'provider:' => this is the response the the eip1193 request
 */
export interface EIP1193ProxiedEvents {
    // user approves request
    "request:approve": ProviderEventPayload<EIP1193RequestArg>
    // user rejects request
    "request:reject": ProviderEventError<EIP1193ErrorObject>

    // request completed (success or fail)
    "response:complete": ProviderEventError<EIP1193ErrorObject> | ProviderEventPayload<EIP1193RequestResult>

    // eip1193 events proxy
    "provider:event": {
        payload: { event: EIP1193EventName; args: unknown }
    }

    // dapp<->iframe permission checks
    "permission-check:request": ProviderEventPayload<EIP1193Parameters>
    "permission-check:response": ProviderEventPayload<boolean> | ProviderEventError<unknown>
}
