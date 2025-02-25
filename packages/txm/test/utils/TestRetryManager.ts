import type { TransactionReceipt } from "viem"
import { DefaultRetryPolicyManager } from "../../lib/RetryPolicyManager"
import type { Attempt, Transaction } from "../../lib/Transaction"
import type { TransactionManager } from "../../lib/TransactionManager"

export class TestRetryManager extends DefaultRetryPolicyManager {
    private transactionsThatHaveTriedToRetry: string[] = []

    public async shouldRetry(
        _: TransactionManager,
        transaction: Transaction,
        _attempt: Attempt,
        _receipt: TransactionReceipt,
    ): Promise<boolean> {
        this.transactionsThatHaveTriedToRetry.push(transaction.intentId)
        return false
    }

    public haveTriedToRetry(intentId: string): boolean {
        return this.transactionsThatHaveTriedToRetry.includes(intentId)
    }
}
