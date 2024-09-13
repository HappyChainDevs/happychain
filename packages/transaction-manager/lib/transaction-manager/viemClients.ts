import type { Account, Chain, PublicClient, RpcSchema, Transport, WalletClient } from "viem"

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
