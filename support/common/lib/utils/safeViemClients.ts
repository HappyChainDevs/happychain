import { ResultAsync } from "neverthrow"
import type {
    Account,
    Chain,
    EstimateGasErrorType,
    GetChainIdErrorType,
    GetTransactionReceiptErrorType,
    Hash,
    PublicClient,
    RpcErrorType,
    RpcSchema,
    SendRawTransactionErrorType,
    SignTransactionErrorType,
    TransactionRequestEIP1559,
    Transport,
    WalletClient,
} from "viem"
import { unknownToError } from "./error"

/** Equivalent to {@link WalletClient} but asserts that type parameters are not undefined. */
type ViemWalletClient<
    T1 extends Transport = Transport,
    T2 extends Chain = Chain,
    T3 extends Account = Account,
    T4 extends RpcSchema = RpcSchema,
> = WalletClient<T1, T2, T3, T4>

/** Equivalent to {@link WalletClient} but asserts that type parameters are not undefined. */
type ViemPublicClient<
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

export type SafeViemPublicClient = ReturnType<typeof convertToSafeViemPublicClient>

export function convertToSafeViemPublicClient(client: ViemPublicClient) {
    return client.extend((client) => ({
        safeEstimateGas: async (...args: Parameters<ViemPublicClient["estimateGas"]>) =>
            ResultAsync.fromPromise<Awaited<ReturnType<ViemPublicClient["estimateGas"]>>, EstimateGasErrorType>(
                client.estimateGas(...args),
                unknownToError as (u: unknown) => EstimateGasErrorType,
            ),
        safeGetTransactionReceipt: async (...args: Parameters<ViemPublicClient["getTransactionReceipt"]>) =>
            ResultAsync.fromPromise<
                Awaited<ReturnType<ViemPublicClient["getTransactionReceipt"]>>,
                GetTransactionReceiptErrorType
            >(client.getTransactionReceipt(...args), unknownToError as (u: unknown) => GetTransactionReceiptErrorType),
        safeDebugTransaction: async (...args: DebugTransactionSchema["Parameters"]) =>
            ResultAsync.fromPromise<DebugTransactionSchema["ReturnType"], RpcErrorType>(
                client.request({
                    method: "debug_traceTransaction",
                    params: args,
                }),
                unknownToError as (u: unknown) => RpcErrorType,
            ),
        safeGetChainId: async () =>
            ResultAsync.fromPromise<Awaited<ReturnType<ViemPublicClient["getChainId"]>>, GetChainIdErrorType>(
                client.getChainId(),
                unknownToError as (u: unknown) => GetChainIdErrorType,
            ),
    }))
}

export type SafeViemWalletClient = ReturnType<typeof convertToSafeViemWalletClient>

export function convertToSafeViemWalletClient(client: ViemWalletClient) {
    return client.extend((client) => ({
        safeSendRawTransaction: async (...args: Parameters<ViemWalletClient["sendRawTransaction"]>) =>
            ResultAsync.fromPromise<
                Awaited<ReturnType<ViemWalletClient["sendRawTransaction"]>>,
                SendRawTransactionErrorType
            >(client.sendRawTransaction(...args), unknownToError as (u: unknown) => SendRawTransactionErrorType),
        safeSignTransaction: async (args: TransactionRequestEIP1559 & { gas: bigint }) =>
            ResultAsync.fromThrowable(() => {
                if (client.account.signTransaction) {
                    return client.account.signTransaction({
                        ...args,
                        chainId: client.chain.id,
                    })
                }
                // biome-ignore format: tidy
                console.warn(
                    "No signTransaction method found on the account, using signMessage instead. " +
                    "A viem update probably change the internal signing API.")
                return client.signTransaction(args)
            })() as ResultAsync<Awaited<ReturnType<ViemWalletClient["signTransaction"]>>, SignTransactionErrorType>,
    }))
}
