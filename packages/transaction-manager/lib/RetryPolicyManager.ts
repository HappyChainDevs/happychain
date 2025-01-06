import type { TransactionReceipt } from "viem"
import type { Attempt, Transaction } from "./Transaction"
import type { TransactionManager } from "./TransactionManager"

export type RevertedTransactionReceipt<Status extends "success" | "reverted"> = TransactionReceipt<
    bigint,
    number,
    Status,
    "eip1559"
>

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
        receipt: RevertedTransactionReceipt<"reverted">,
    ): Promise<boolean>
}

export class DefaultRetryPolicyManager implements RetryPolicyManager {
    public async shouldRetry(
        transactionManager: TransactionManager,
        _: Transaction,
        attempt: Attempt,
        receipt: RevertedTransactionReceipt<"reverted">,
    ): Promise<boolean> {
        return this.isOutOfGas(transactionManager, attempt, receipt)
    }

    /**
     * Retrieves the reason for transaction reversion by utilizing the debug_traceTransaction RPC method.
     * Returns undefined if the request fails or if the transaction has not been reverted.
     * @param transactionManager - The transaction manager
     * @param attempt - The attempt
     * @returns The revert reason or undefined if it cannot be retrieved or the rpc does not allow debug
     */
    protected async getRevertReason(
        transactionManager: TransactionManager,
        attempt: Attempt,
    ): Promise<string | undefined> {
        const traceResult = transactionManager.rpcAllowDebug
            ? await transactionManager.viemClient.safeDebugTransaction(attempt.hash, {
                  tracer: "callTracer",
              })
            : undefined

        if (!traceResult || traceResult.isErr()) {
            return undefined
        }

        return traceResult.value.revertReason
    }

    protected async isOutOfGas(
        transactionManager: TransactionManager,
        attempt: Attempt,
        receipt: RevertedTransactionReceipt<"reverted">,
    ): Promise<boolean> {
        const revertReason = await this.getRevertReason(transactionManager, attempt)

        if (!revertReason) {
            return receipt.gasUsed === attempt.gas
        }

        return revertReason === "Out of Gas"
    }
}
