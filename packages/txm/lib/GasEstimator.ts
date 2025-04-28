import { SpanStatusCode, context, trace } from "@opentelemetry/api"
import { type Result, err, ok } from "neverthrow"
import { encodeFunctionData } from "viem"
import type { Transaction } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"
import { TraceMethod } from "./telemetry/traces"

export enum EstimateGasErrorCause {
    EstimateGasABINotFound = "EstimateGasABINotFound",
    EstimateGasClientError = "EstimateGasClientError",
}

export interface EstimateGasError {
    cause: EstimateGasErrorCause
    description: string
}

/**
 * This is the interface that you have to implement if you want to provide a custom gas estimator.
 * The default implementation is {@link DefaultGasLimitEstimator}.
 *
 * You have to implement this interface if the standard gas estimation method does not work. That's because the standard method
 * simulates the transaction against the current blockchain state, which can change when the transaction is actually executed onchain.
 * This can lead to inaccurate gas estimations that cause transactions to revert onchain. It can also lead happen that some transactions fail
 * at the estimation stage when they would have succeeded on chain. For instance, this can happen to transactions
 * who have a strict requirement on the block number or timestamp on or after which they should land.
 *
 * By avoiding transaction simulation, you can also improve the performance of the transaction manager.
 * You eliminate an RPC call, increasing the likelihood that your transaction will be included in the next block.
 * Furthermore, if you're always executing the same type of transaction, it typically consumes a similar amount of gas.
 * In those cases, an upper bound of the gas limit can be computed in advance and injected by a custom gas estimator.
 *
 * In some cases, you may want to hardcode the gas limit anyway (if at all possible). Doing so avoids an extra round-trip to the RPC server,
 * which might help your transaction land in an earlier block and will save on RPC costs.
 *
 * Because the extra gas gets refunded, this is both safe and doesn't incur extra cost,
 * though it increases your gas capital requirement if you have a lot of transactions in flight.
 */
export interface GasEstimator {
    estimateGas(
        transactionManager: TransactionManager,
        transaction: Transaction,
    ): Promise<Result<bigint, EstimateGasError>>
}

/**
 * This is the default module used to estimate the gas for a transaction. When creating a new transaction manager,
 * you can instead pass a custom gas estimator implementing {@link GasEstimator}.
 * Whenever applicable, you should extend this class to reuse the protected {@link simulateTransactionForGas} method.
 *
 * This class estimates the gas by simulating the transaction against the current blockchain state.
 */
export class DefaultGasLimitEstimator implements GasEstimator {
    public async estimateGas(
        transactionManager: TransactionManager,
        transaction: Transaction,
    ): Promise<Result<bigint, EstimateGasError>> {
        return this.simulateTransactionForGas(transactionManager, transaction)
    }

    /**
     * This protected method is created to allow classes that extend GasEstimator
     * to use the default case without needing to reimplement it. This is particularly
     * useful for services like the Randomness service.
     */
    @TraceMethod("txm.gas-estimator.simulate-transaction-for-gas")
    protected async simulateTransactionForGas(
        transactionManager: TransactionManager,
        transaction: Transaction,
    ): Promise<Result<bigint, EstimateGasError>> {
        const span = trace.getSpan(context.active())!

        const gasResult = await transactionManager.viemClient.safeEstimateGas({
            account: transactionManager.viemWallet.account,
            to: transaction.address,
            data: transaction.calldata,
            value: 0n,
        })

        if (gasResult.isErr()) {
            const description = `Failed to estimate gas for transaction ${transaction.intentId}. Details: ${gasResult.error}`
            span.recordException(new Error(description))
            span.setStatus({ code: SpanStatusCode.ERROR })
            return err({
                cause: EstimateGasErrorCause.EstimateGasClientError,
                description,
            })
        }

        span.addEvent("txm.gas-estimator.simulate-transaction-for-gas.succeeded", {
            transactionIntentId: transaction.intentId,
            gas: Number(gasResult.value),
        })

        return ok(gasResult.value)
    }
}
