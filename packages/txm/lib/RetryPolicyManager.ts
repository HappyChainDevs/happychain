import { type Result, err, ok } from "neverthrow"
import { type TransactionReceipt, encodeErrorResult } from "viem"
import type { Attempt, Transaction } from "./Transaction"
import type { TransactionManager } from "./TransactionManager"
import { TraceMethod } from "./telemetry/traces"

export type RevertedTransactionReceipt = TransactionReceipt<bigint, number, "reverted", "eip1559">

/**
 * Implement this interface and provide it in the {@link TransactionManager} constructor to define your custom retry policy.
 * The default implementation is {@link DefaultRetryPolicyManager}.
 * The default implementation will only retry if the transaction runs out of gas.
 **/
export interface RetryPolicyManager {
    shouldRetry(
        transactionManager: TransactionManager,
        transaction: Transaction,
        attempt: Attempt,
        receipt: RevertedTransactionReceipt,
    ): Promise<boolean>
}

/**
 * This is the default retry policy manager that will we used if no custom retry policy manager is provided.
 * It will only retry if the transaction runs out of gas.
 */
export class DefaultRetryPolicyManager implements RetryPolicyManager {
    @TraceMethod("txm.retry-policy-manager.should-retry")
    public async shouldRetry(
        transactionManager: TransactionManager,
        _: Transaction,
        attempt: Attempt,
        receipt: RevertedTransactionReceipt,
    ): Promise<boolean> {
        return this.isOutOfGas(transactionManager, attempt, receipt)
    }

    /**
     * Retrieves the message for transaction reversion by utilizing the debug_traceTransaction RPC method.
     * Returns undefined if the request fails or if the transaction has not been reverted.
     * @param transactionManager - The transaction manager
     * @param attempt - The attempt
     * @returns The revert message or undefined if it cannot be retrieved or the rpc does not allow debug
     */
    @TraceMethod("txm.retry-policy-manager.get-revert-message-and-output")
    protected async getRevertMessageAndOutput(
        transactionManager: TransactionManager,
        attempt: Attempt,
    ): Promise<{ message: string | undefined; output: string | undefined }> {
        const traceResult = transactionManager.rpcAllowDebug
            ? await transactionManager.viemClient.safeDebugTransaction(attempt.hash, {
                  tracer: "callTracer",
              })
            : undefined

        if (!traceResult || traceResult.isErr()) {
            return { message: undefined, output: undefined }
        }

        return { message: traceResult.value.error, output: traceResult.value.output }
    }

    @TraceMethod("txm.retry-policy-manager.is-out-of-gas")
    protected async isOutOfGas(
        transactionManager: TransactionManager,
        attempt: Attempt,
        receipt: RevertedTransactionReceipt,
    ): Promise<boolean> {
        const { message } = await this.getRevertMessageAndOutput(transactionManager, attempt)

        if (!message) {
            return receipt.gasUsed === attempt.gas
        }

        return message === "Out of Gas"
    }

    @TraceMethod("txm.retry-policy-manager.is-reverted-with-message")
    protected async isRevertedWithMessage(
        transactionManager: TransactionManager,
        attempt: Attempt,
        message: string,
    ): Promise<boolean> {
        const { message: _message } = await this.getRevertMessageAndOutput(transactionManager, attempt)

        return _message === message
    }

    @TraceMethod("txm.retry-policy-manager.is-custom-error")
    protected async isCustomError(
        transactionManager: TransactionManager,
        transaction: Transaction,
        attempt: Attempt,
        customError: string,
    ): Promise<Result<boolean, Error>> {
        const { output } = await this.getRevertMessageAndOutput(transactionManager, attempt)

        if (!output) {
            return ok(false)
        }

        const abi = transactionManager.abiManager.get(transaction.contractName)

        if (!abi) {
            return err(new Error("Contract not found"))
        }

        return ok(
            encodeErrorResult({
                abi: abi,
                errorName: customError,
            }) === output,
        )
    }
}
