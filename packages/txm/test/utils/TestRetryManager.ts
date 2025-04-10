import type { TransactionReceipt } from "viem"
import { DefaultRetryPolicyManager } from "../../lib/RetryPolicyManager"
import type { Attempt, Transaction } from "../../lib/Transaction"
import type { TransactionManager } from "../../lib/TransactionManager"

export class TestRetryManager extends DefaultRetryPolicyManager {
    private transactionsThatHaveTriedToRetry: string[] = []

    public async shouldRetry(
        _txm: TransactionManager,
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

    public getRevertMessageAndOutput(txm: TransactionManager, attempt: Attempt) {
        return super.getRevertMessageAndOutput(txm, attempt)
    }

    public revertWithCustomError(
        txm: TransactionManager,
        transaction: Transaction,
        attempt: Attempt,
        customError: string,
    ) {
        if (!transaction.contractName) {
            throw new Error("Contract name is required to check if a transaction has reverted with a custom error")
        }

        const abi = txm.abiManager.get(transaction.contractName)
        if (!abi) {
            throw new Error(`ABI not found for contract ${transaction.contractName}`)
        }
        return super.isCustomError(txm, attempt, abi, customError)
    }
}
