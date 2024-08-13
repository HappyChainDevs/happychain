import type { EIP1193EventMap, EIP1193RequestFn, EIP1474Methods, RpcSchema, RpcSchemaOverride } from 'viem'

import type { EIP1193ErrorObject } from './errors'

// pulled from Viem internals
type DerivedRpcSchema<
    rpcSchema extends RpcSchema | undefined,
    rpcSchemaOverride extends RpcSchemaOverride | undefined,
> = rpcSchemaOverride extends RpcSchemaOverride ? [rpcSchemaOverride & { Method: string }] : rpcSchema

export type EventUUID = ReturnType<typeof crypto.randomUUID>
export type EIP1193RequestArg = Parameters<EIP1193RequestFn>[0]

export type EIP1193RequestResult<TParams extends EIP1193RequestArg = EIP1193RequestArg> =
    DerivedRpcSchema<EIP1474Methods, undefined> extends RpcSchema
        ? Extract<DerivedRpcSchema<EIP1474Methods, undefined>[number], { Method: TParams['method'] }>['ReturnType']
        : unknown

export type EIP1193EventName<T extends string = keyof EIP1193EventMap> = T

/**
 * Naming Convention:
 * 'request:' => these are user JSON-RPC requests and are sent from the dapp (providerProxy) to the iframe
 *
 * 'provider:' => this is the response the the eip1193 request
 */
export interface EIP1193ProxiedEvents {
    // user approves request
    'request:approve': {
        key: EventUUID
        error: null
        payload: EIP1193RequestArg
    }
    // user rejects request
    'request:reject': {
        key: EventUUID
        error: EIP1193ErrorObject
        payload: null
    }

    // request completed (success or fail)
    'response:complete':
        | {
              key: EventUUID
              error: EIP1193ErrorObject
              payload: null
          }
        | {
              key: EventUUID
              error: null
              payload: EIP1193RequestResult
          }

    // eip1193 events proxy
    'provider:event': {
        payload: { event: EIP1193EventName; args: unknown }
    }
}
