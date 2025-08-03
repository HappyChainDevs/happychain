import { bigIntReplacer, unknownToError } from "@happy.tech/common"
import { isNullish } from "@happy.tech/common"
import type { Counter, Histogram, Tracer } from "@opentelemetry/api"
import { ResultAsync, errAsync, okAsync } from "neverthrow"
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
    tracer: Tracer | undefined

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
    safeGetFeeHistory: (
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
    tracer?: Tracer,
): SafeViemPublicClient {
    const safeClient = client as SafeViemPublicClient

    safeClient.rpcCounter = metrics?.rpcCounter
    safeClient.rpcErrorCounter = metrics?.rpcErrorCounter
    safeClient.rpcResponseTimeHistogram = metrics?.rpcResponseTimeHistogram
    safeClient.tracer = tracer

    safeClient.safeEstimateGas = (...args: Parameters<ViemPublicClient["estimateGas"]>) => {
        const span = safeClient.tracer?.startSpan("safe-viem-public-client.estimate-gas")
        if (safeClient.rpcCounter) safeClient.rpcCounter.add(1, { method: "estimateGas" })
        const startTime = Date.now()

        return ResultAsync.fromPromise(client.estimateGas(...args), unknownToError)
            .andThen(errorOnNullish)
            .andTee((result) => {
                const duration = Date.now() - startTime
                if (safeClient.rpcResponseTimeHistogram)
                    safeClient.rpcResponseTimeHistogram.record(duration, { method: "estimateGas" })
                span?.addEvent("safe-viem-public-client.estimate-gas.success", {
                    result: JSON.stringify(result, bigIntReplacer),
                })
                span?.end()
            })
            .mapErr((error) => {
                if (safeClient.rpcErrorCounter) {
                    safeClient.rpcErrorCounter.add(1, { method: "estimateGas" })
                }
                span?.recordException(error)
                span?.end()
                return error as EstimateGasErrorType
            })
    }

    safeClient.safeGetTransactionReceipt = (...args: Parameters<ViemPublicClient["getTransactionReceipt"]>) => {
        const span = safeClient.tracer?.startSpan("safe-viem-public-client.get-transaction-receipt")
        if (safeClient.rpcCounter) safeClient.rpcCounter.add(1, { method: "getTransactionReceipt" })
        const startTime = Date.now()

        return ResultAsync.fromPromise(client.getTransactionReceipt(...args), unknownToError)
            .andThen(errorOnNullish)
            .andTee((result) => {
                const duration = Date.now() - startTime
                if (safeClient.rpcResponseTimeHistogram)
                    safeClient.rpcResponseTimeHistogram.record(duration, { method: "getTransactionReceipt" })
                span?.addEvent("safe-viem-public-client.get-transaction-receipt.success", {
                    result: JSON.stringify(result, bigIntReplacer),
                })
                span?.end()
            })
            .mapErr((error) => {
                if (safeClient.rpcErrorCounter) {
                    safeClient.rpcErrorCounter.add(1, { method: "getTransactionReceipt" })
                }
                span?.recordException(error)
                span?.end()
                return error as GetTransactionReceiptErrorType
            })
    }

    safeClient.safeDebugTransaction = (...args: DebugTransactionSchema["Parameters"]) => {
        const span = safeClient.tracer?.startSpan("safe-viem-public-client.debug-transaction")
        if (safeClient.rpcCounter) safeClient.rpcCounter.add(1, { method: "debug_traceTransaction" })
        const startTime = Date.now()

        return ResultAsync.fromPromise(
            client.request({
                method: "debug_traceTransaction",
                params: args,
            }),
            unknownToError,
        )
            .andThen(errorOnNullish)
            .map((result) => {
                const duration = Date.now() - startTime
                if (safeClient.rpcResponseTimeHistogram)
                    safeClient.rpcResponseTimeHistogram.record(duration, { method: "debug_traceTransaction" })
                span?.addEvent("safe-viem-public-client.debug-transaction.success", {
                    result: JSON.stringify(result, bigIntReplacer),
                })
                span?.end()
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
        const span = safeClient.tracer?.startSpan("safe-viem-public-client.get-chain-id")
        if (safeClient.rpcCounter) safeClient.rpcCounter.add(1, { method: "getChainId" })
        const startTime = Date.now()

        return ResultAsync.fromPromise(client.getChainId(), unknownToError)
            .andThen(errorOnNullish)
            .andTee((result) => {
                const duration = Date.now() - startTime
                if (safeClient.rpcResponseTimeHistogram)
                    safeClient.rpcResponseTimeHistogram.record(duration, { method: "getChainId" })
                span?.addEvent("safe-viem-public-client.get-chain-id.success", {
                    result: result.toString(),
                })
                span?.end()
            })
            .mapErr((error) => {
                if (safeClient.rpcErrorCounter) {
                    safeClient.rpcErrorCounter.add(1, { method: "getChainId" })
                }
                span?.recordException(error)
                span?.end()
                return error as GetChainIdErrorType
            })
    }

    safeClient.safeGetTransactionCount = (...args: Parameters<ViemPublicClient["getTransactionCount"]>) => {
        const span = safeClient.tracer?.startSpan("safe-viem-public-client.get-transaction-count")
        if (safeClient.rpcCounter) safeClient.rpcCounter.add(1, { method: "getTransactionCount" })
        const startTime = Date.now()

        return ResultAsync.fromPromise(client.getTransactionCount(...args), unknownToError)
            .andThen(errorOnNullish)
            .andTee((result) => {
                const duration = Date.now() - startTime
                if (safeClient.rpcResponseTimeHistogram)
                    safeClient.rpcResponseTimeHistogram.record(duration, { method: "getTransactionCount" })
                span?.addEvent("safe-viem-public-client.get-transaction-count.success", {
                    result: result.toString(),
                })
                span?.end()
            })
            .mapErr((error) => {
                if (safeClient.rpcErrorCounter) {
                    safeClient.rpcErrorCounter.add(1, { method: "getTransactionCount" })
                }
                span?.recordException(error)
                span?.end()
                return error as GetTransactionCountErrorType
            })
    }

    safeClient.safeGetFeeHistory = (...args: Parameters<ViemPublicClient["getFeeHistory"]>) => {
        const span = safeClient.tracer?.startSpan("safe-viem-public-client.get-fee-history")
        if (safeClient.rpcCounter) safeClient.rpcCounter.add(1, { method: "getFeeHistory" })
        const startTime = Date.now()

        return ResultAsync.fromPromise(client.getFeeHistory(...args), unknownToError)
            .andThen(errorOnNullish)
            .andTee((result) => {
                const duration = Date.now() - startTime
                if (safeClient.rpcResponseTimeHistogram)
                    safeClient.rpcResponseTimeHistogram.record(duration, { method: "getFeeHistory" })
                span?.addEvent("safe-viem-public-client.get-fee-history.success", {
                    result: JSON.stringify(result, bigIntReplacer),
                })
                span?.end()
            })
            .mapErr((error) => {
                if (safeClient.rpcErrorCounter) {
                    safeClient.rpcErrorCounter.add(1, { method: "getFeeHistory" })
                }
                span?.recordException(error)
                span?.end()
                return error as GetFeeHistoryErrorType
            })
    }

    return safeClient
}

export interface SafeViemWalletClient extends ViemWalletClient {
    rpcCounter?: Counter
    rpcErrorCounter?: Counter
    rpcResponseTimeHistogram?: Histogram
    tracer?: Tracer

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
    tracer?: Tracer,
): SafeViemWalletClient {
    const safeClient = client as SafeViemWalletClient

    safeClient.rpcCounter = metrics?.rpcCounter
    safeClient.rpcErrorCounter = metrics?.rpcErrorCounter
    safeClient.rpcResponseTimeHistogram = metrics?.rpcResponseTimeHistogram
    safeClient.tracer = tracer

    safeClient.safeSendRawTransaction = (...args: Parameters<ViemWalletClient["sendRawTransaction"]>) => {
        const span = safeClient.tracer?.startSpan("safe-viem-wallet-client.send-raw-transaction")
        if (safeClient.rpcCounter) safeClient.rpcCounter.add(1, { method: "sendRawTransaction" })
        const startTime = Date.now()

        return ResultAsync.fromPromise(client.sendRawTransaction(...args), unknownToError)
            .andThen(errorOnNullish)
            .andTee((result) => {
                const duration = Date.now() - startTime
                if (safeClient.rpcResponseTimeHistogram)
                    safeClient.rpcResponseTimeHistogram.record(duration, { method: "sendRawTransaction" })
                span?.addEvent("safe-viem-wallet-client.send-raw-transaction.success", {
                    result: result.toString(),
                })
                span?.end()
            })
            .mapErr((error) => {
                if (safeClient.rpcErrorCounter) {
                    safeClient.rpcErrorCounter.add(1, { method: "sendRawTransaction" })
                }
                span?.recordException(error)
                span?.end()
                return error as SendRawTransactionErrorType
            })
    }

    safeClient.safeSignTransaction = (args: TransactionRequestEIP1559 & { gas: bigint }) => {
        const span = safeClient.tracer?.startSpan("safe-viem-wallet-client.sign-transaction")
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
            .andThen(errorOnNullish)
            .andTee((result) => {
                const duration = Date.now() - startTime
                if (safeClient.rpcResponseTimeHistogram)
                    safeClient.rpcResponseTimeHistogram.record(duration, { method: "signTransaction" })
                span?.addEvent("safe-viem-wallet-client.sign-transaction.success", {
                    result: JSON.stringify(result, bigIntReplacer),
                })
                span?.end()
            })
            .mapErr((error) => {
                if (safeClient.rpcErrorCounter) {
                    safeClient.rpcErrorCounter.add(1, { method: "signTransaction" })
                }
                span?.recordException(unknownToError(error))
                span?.end()
                return error as SignTransactionErrorType
            })
    }

    return safeClient
}

class NullishResultError extends Error {}

// Note that undefined error results are not hypothetical: we have observed them with our ProxyServer testing util when
// the connection is shut down. This should now never occurs, but we used ProxyServer shut down the connection when
// instructed to not answer — now we wait for 1 minute (but then shut down the connection). Viem just doesn't seem to
// handle this case gracefully?

function errorOnNullish<T>(result: T): ResultAsync<T, NullishResultError> {
    return isNullish(result) ? errAsync(new NullishResultError("nullish result")) : okAsync(result)
}
