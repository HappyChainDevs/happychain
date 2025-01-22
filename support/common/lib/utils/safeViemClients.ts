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
import { unknownToError } from "./error.js"

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

export interface SafeViemPublicClient extends ViemPublicClient {
    safeEstimateGas: (
        ...args: Parameters<ViemPublicClient["estimateGas"]>
    ) => ResultAsync<Awaited<ReturnType<ViemPublicClient["estimateGas"]>>, EstimateGasErrorType>
    safeGetTransactionReceipt: (
        ...args: Parameters<ViemPublicClient["getTransactionReceipt"]>
    ) => ResultAsync<Awaited<ReturnType<ViemPublicClient["getTransactionReceipt"]>>, GetTransactionReceiptErrorType>
    safeDebugTransaction: (
        ...args: DebugTransactionSchema["Parameters"]
    ) => ResultAsync<DebugTransactionSchema["ReturnType"], RpcErrorType>
    safeGetChainId: () => ResultAsync<Awaited<ReturnType<ViemPublicClient["getChainId"]>>, GetChainIdErrorType>
}

export function convertToSafeViemPublicClient(client: ViemPublicClient): SafeViemPublicClient {
    Object.assign(client, {
        safeEstimateGas: async (...args: Parameters<ViemPublicClient["estimateGas"]>) =>
            ResultAsync.fromPromise(client.estimateGas(...args), unknownToError),
        safeGetTransactionReceipt: async (...args: Parameters<ViemPublicClient["getTransactionReceipt"]>) =>
            ResultAsync.fromPromise(client.getTransactionReceipt(...args), unknownToError),
        safeDebugTransaction: async (...args: DebugTransactionSchema["Parameters"]) =>
            ResultAsync.fromPromise(
                client.request({
                    method: "debug_traceTransaction",
                    params: args,
                }),
                unknownToError,
            ),
        safeGetChainId: async () => ResultAsync.fromPromise(client.getChainId(), unknownToError),
    })

    return client as SafeViemPublicClient
}

export interface SafeViemWalletClient extends ViemWalletClient {
    safeSendRawTransaction: (
        ...args: Parameters<ViemWalletClient["sendRawTransaction"]>
    ) => ResultAsync<Awaited<ReturnType<ViemWalletClient["sendRawTransaction"]>>, SendRawTransactionErrorType>
    safeSignTransaction: (
        args: TransactionRequestEIP1559 & { gas: bigint },
    ) => ResultAsync<Awaited<ReturnType<ViemWalletClient["signTransaction"]>>, SignTransactionErrorType>
}

export function convertToSafeViemWalletClient(client: ViemWalletClient): SafeViemWalletClient {
    Object.assign(client, {
        safeSendRawTransaction: async (...args: Parameters<ViemWalletClient["sendRawTransaction"]>) =>
            ResultAsync.fromPromise(client.sendRawTransaction(...args), unknownToError),
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
            })(),
    })

    return client as SafeViemWalletClient
}
