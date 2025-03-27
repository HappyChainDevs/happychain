import { unknownToError } from "@happy.tech/common"
import type { Counter, Histogram } from "@opentelemetry/api"
import { ResultAsync } from "neverthrow"
import type {
    Account,
    Chain,
    EstimateGasErrorType,
    GetChainIdErrorType,
    GetFeeHistoryErrorType,
    GetTransactionCountErrorType,
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
    /**
     * When a transaction reverts, this field contains the revert reason message.
     * For custom errors, this will always be 'Reverted'.
     * For out of gas scenarios, this will be 'Out of Gas'.
     */
    error?: string
    /**
     * When a transaction reverts with a custom error, this field contains the custom error signature
     */
    output?: string
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
    rpcCounter: Counter | undefined
    rpcErrorCounter: Counter | undefined
    rpcResponseTimeHistogram: Histogram | undefined

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
    safeGetTransactionCount: (
        ...args: Parameters<ViemPublicClient["getTransactionCount"]>
    ) => ResultAsync<Awaited<ReturnType<ViemPublicClient["getTransactionCount"]>>, GetTransactionCountErrorType>
    safeFeeHistory: (
        ...args: Parameters<ViemPublicClient["getFeeHistory"]>
    ) => ResultAsync<Awaited<ReturnType<ViemPublicClient["getFeeHistory"]>>, GetFeeHistoryErrorType>
}

export interface MetricsHandlers {
    rpcCounter?: Counter
    rpcErrorCounter?: Counter
    rpcResponseTimeHistogram?: Histogram
}

export function convertToSafeViemPublicClient(
    client: ViemPublicClient,
    metrics?: MetricsHandlers,
): SafeViemPublicClient {
    const safeClient = client as SafeViemPublicClient

    safeClient.rpcCounter = metrics?.rpcCounter
    safeClient.rpcErrorCounter = metrics?.rpcErrorCounter
    safeClient.rpcResponseTimeHistogram = metrics?.rpcResponseTimeHistogram

    safeClient.safeEstimateGas = (...args: Parameters<ViemPublicClient["estimateGas"]>) => {
        if (safeClient.rpcCounter) safeClient.rpcCounter.add(1, { method: "estimateGas" })
        const startTime = Date.now()

        return ResultAsync.fromPromise(client.estimateGas(...args), unknownToError)
            .map((result) => {
                const duration = Date.now() - startTime
                if (safeClient.rpcResponseTimeHistogram)
                    safeClient.rpcResponseTimeHistogram.record(duration, { method: "estimateGas" })
                return result
            })
            .mapErr((error) => {
                if (safeClient.rpcErrorCounter) {
                    safeClient.rpcErrorCounter.add(1, { method: "estimateGas" })
                }
                return error as EstimateGasErrorType
            })
    }

    safeClient.safeGetTransactionReceipt = (...args: Parameters<ViemPublicClient["getTransactionReceipt"]>) => {
        if (safeClient.rpcCounter) safeClient.rpcCounter.add(1, { method: "getTransactionReceipt" })
        const startTime = Date.now()

        return ResultAsync.fromPromise(client.getTransactionReceipt(...args), unknownToError)
            .map((result) => {
                const duration = Date.now() - startTime
                if (safeClient.rpcResponseTimeHistogram)
                    safeClient.rpcResponseTimeHistogram.record(duration, { method: "getTransactionReceipt" })
                return result
            })
            .mapErr((error) => {
                if (safeClient.rpcErrorCounter) {
                    safeClient.rpcErrorCounter.add(1, { method: "getTransactionReceipt" })
                }
                return error as GetTransactionReceiptErrorType
            })
    }

    safeClient.safeDebugTransaction = (...args: DebugTransactionSchema["Parameters"]) => {
        if (safeClient.rpcCounter) safeClient.rpcCounter.add(1, { method: "debug_traceTransaction" })
        const startTime = Date.now()

        return ResultAsync.fromPromise(
            client.request({
                method: "debug_traceTransaction",
                params: args,
            }),
            unknownToError,
        )
            .map((result) => {
                const duration = Date.now() - startTime
                if (safeClient.rpcResponseTimeHistogram)
                    safeClient.rpcResponseTimeHistogram.record(duration, { method: "debug_traceTransaction" })
                return result as Call
            })
            .mapErr((error) => {
                if (safeClient.rpcErrorCounter) {
                    safeClient.rpcErrorCounter.add(1, { method: "debug_traceTransaction" })
                }
                return error as RpcErrorType
            })
    }

    safeClient.safeGetChainId = () => {
        if (safeClient.rpcCounter) safeClient.rpcCounter.add(1, { method: "getChainId" })
        const startTime = Date.now()

        return ResultAsync.fromPromise(client.getChainId(), unknownToError)
            .map((result) => {
                const duration = Date.now() - startTime
                if (safeClient.rpcResponseTimeHistogram)
                    safeClient.rpcResponseTimeHistogram.record(duration, { method: "getChainId" })
                return result
            })
            .mapErr((error) => {
                if (safeClient.rpcErrorCounter) {
                    safeClient.rpcErrorCounter.add(1, { method: "getChainId" })
                }
                return error as GetChainIdErrorType
            })
    }

    safeClient.safeGetTransactionCount = (...args: Parameters<ViemPublicClient["getTransactionCount"]>) => {
        if (safeClient.rpcCounter) safeClient.rpcCounter.add(1, { method: "getTransactionCount" })
        const startTime = Date.now()

        return ResultAsync.fromPromise(client.getTransactionCount(...args), unknownToError)
            .map((result) => {
                const duration = Date.now() - startTime
                if (safeClient.rpcResponseTimeHistogram)
                    safeClient.rpcResponseTimeHistogram.record(duration, { method: "getTransactionCount" })
                return result
            })
            .mapErr((error) => {
                if (safeClient.rpcErrorCounter) {
                    safeClient.rpcErrorCounter.add(1, { method: "getTransactionCount" })
                }
                return error as GetTransactionCountErrorType
            })
    }

    safeClient.safeFeeHistory = (...args: Parameters<ViemPublicClient["getFeeHistory"]>) => {
        if (safeClient.rpcCounter) safeClient.rpcCounter.add(1, { method: "getFeeHistory" })
        const startTime = Date.now()

        return ResultAsync.fromPromise(client.getFeeHistory(...args), unknownToError)
            .map((result) => {
                const duration = Date.now() - startTime
                if (safeClient.rpcResponseTimeHistogram)
                    safeClient.rpcResponseTimeHistogram.record(duration, { method: "getFeeHistory" })
                return result
            })
            .mapErr((error) => {
                if (safeClient.rpcErrorCounter) {
                    safeClient.rpcErrorCounter.add(1, { method: "getFeeHistory" })
                }
                return error as GetFeeHistoryErrorType
            })
    }

    return safeClient
}

export interface SafeViemWalletClient extends ViemWalletClient {
    rpcCounter?: Counter
    rpcErrorCounter?: Counter
    rpcResponseTimeHistogram?: Histogram

    safeSendRawTransaction: (
        ...args: Parameters<ViemWalletClient["sendRawTransaction"]>
    ) => ResultAsync<Awaited<ReturnType<ViemWalletClient["sendRawTransaction"]>>, SendRawTransactionErrorType>
    safeSignTransaction: (
        args: TransactionRequestEIP1559 & { gas: bigint },
    ) => ResultAsync<Awaited<ReturnType<ViemWalletClient["signTransaction"]>>, SignTransactionErrorType>
}

export function convertToSafeViemWalletClient(
    client: ViemWalletClient,
    metrics?: MetricsHandlers,
): SafeViemWalletClient {
    const safeClient = client as SafeViemWalletClient

    safeClient.rpcCounter = metrics?.rpcCounter
    safeClient.rpcErrorCounter = metrics?.rpcErrorCounter
    safeClient.rpcResponseTimeHistogram = metrics?.rpcResponseTimeHistogram

    safeClient.safeSendRawTransaction = (...args: Parameters<ViemWalletClient["sendRawTransaction"]>) => {
        if (safeClient.rpcCounter) safeClient.rpcCounter.add(1, { method: "sendRawTransaction" })
        const startTime = Date.now()

        return ResultAsync.fromPromise(client.sendRawTransaction(...args), unknownToError)
            .map((result) => {
                const duration = Date.now() - startTime
                if (safeClient.rpcResponseTimeHistogram)
                    safeClient.rpcResponseTimeHistogram.record(duration, { method: "sendRawTransaction" })
                return result
            })
            .mapErr((error) => {
                if (safeClient.rpcErrorCounter) {
                    safeClient.rpcErrorCounter.add(1, { method: "sendRawTransaction" })
                }
                return error as SendRawTransactionErrorType
            })
    }

    safeClient.safeSignTransaction = (args: TransactionRequestEIP1559 & { gas: bigint }) => {
        if (safeClient.rpcCounter) safeClient.rpcCounter.add(1, { method: "signTransaction" })
        const startTime = Date.now()

        return ResultAsync.fromThrowable(() => {
            // We first attempt to use the account's signTransaction method since it's more efficient:
            // it doesn't make an additional getChainId RPC call when chainId is provided.
            // If the account's signTransaction is not available, we fallback to the client's
            // signTransaction method, which will make a getChainId call even if chainId is provided.

            if (client.account.signTransaction) {
                return client.account.signTransaction({
                    ...args,
                    chainId: client.chain.id,
                })
            }
            // biome-ignore format: tidy
            console.warn(
                "No signTransaction method found on the account, using signMessage instead. " +
                "A viem update probably change the internal signing API.");
            return client.signTransaction(args)
        })()
            .map((result) => {
                const duration = Date.now() - startTime
                if (safeClient.rpcResponseTimeHistogram)
                    safeClient.rpcResponseTimeHistogram.record(duration, { method: "signTransaction" })
                return result
            })
            .mapErr((error) => {
                if (safeClient.rpcErrorCounter) {
                    safeClient.rpcErrorCounter.add(1, { method: "signTransaction" })
                }
                return error as SignTransactionErrorType
            })
    }

    return safeClient
}
