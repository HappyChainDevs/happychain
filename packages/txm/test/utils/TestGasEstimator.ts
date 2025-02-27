import { type Result, ok } from "neverthrow"
import { DefaultGasLimitEstimator, type EstimateGasError } from "../../lib/GasEstimator"
import type { Transaction } from "../../lib/Transaction"
import type { TransactionManager } from "../../lib/TransactionManager"

export class TestGasEstimator extends DefaultGasLimitEstimator {
    override async estimateGas(
        transactionManager: TransactionManager,
        transaction: Transaction,
    ): Promise<Result<bigint, EstimateGasError>> {
        if (transaction.functionName === "intentionalRevert") {
            return ok(40_000n)
        }

        if (transaction.functionName === "intentionalRevertDueToGasLimit") {
            return ok(40_000n)
        }

        return this.simulateTransactionForGas(transactionManager, transaction)
    }
}
