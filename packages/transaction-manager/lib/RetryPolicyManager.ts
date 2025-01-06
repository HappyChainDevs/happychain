import type { TransactionReceipt } from "viem"
import type { Attempt, Transaction } from "./Transaction"
import type { TransactionManager } from "./TransactionManager"

export type RevertedTransactionReceipt<Status extends "success" | "reverted"> = TransactionReceipt<
    bigint,
    number,
    Status,
    "eip1559"
>

export interface IRetryPolicyManager {
    shouldRetry(
        transactionManager: TransactionManager,
        transaction: Transaction,
        attempt: Attempt,
        receipt: RevertedTransactionReceipt<"reverted">,
    ): Promise<boolean>
}

export class RetryPolicyManager implements IRetryPolicyManager {
    public async shouldRetry(
        transactionManager: TransactionManager,
        _: Transaction,
        attempt: Attempt,
        receipt: RevertedTransactionReceipt<"reverted">,
    ): Promise<boolean> {
        return this.isOutOfGas(transactionManager, attempt, receipt)
    }

    /**
     * Get the revert reason from the transaction trace
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
