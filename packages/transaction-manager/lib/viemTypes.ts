import type { Account, Chain, Hash, PublicClient, RpcSchema, Transport, WalletClient } from "viem"

/** Equivalent to {@link WalletClient} but asserts that type parameters are not undefined. */
export type ViemWalletClient<
    T1 extends Transport = Transport,
    T2 extends Chain = Chain,
    T3 extends Account = Account,
    T4 extends RpcSchema = RpcSchema,
> = WalletClient<T1, T2, T3, T4>

/** Equivalent to {@link WalletClient} but asserts that type parameters are not undefined. */
export type ViemPublicClient<
    T1 extends Transport = Transport,
    T2 extends Chain = Chain,
    T3 extends RpcSchema = RpcSchema,
> = PublicClient<T1, T2, undefined, T3>

/**
 * Represents a call in a transaction trace.
 */
export type Call = {
    type: string
    from: string
    to: string
    value: string
    gas: string
    gasUsed: string
    input: string
    error?: string
    revertReason?: string
    calls?: Call[]
}

/**
 *  Request schema for `debug_traceTransaction`
 */
export type DebugTransactionSchema = {
    Parameters: [
        hash: Hash,
        options:
            | {
                  disableStorage?: boolean
                  disableStack?: boolean
                  enableMemory?: boolean
                  enableReturnData?: boolean
                  tracer?: string
              }
            | {
                  timeout?: string
                  tracerConfig?: {
                      onlyTopCall?: boolean
                      withLog?: boolean
                  }
              }
            | undefined,
    ]
    ReturnType: Call
}
