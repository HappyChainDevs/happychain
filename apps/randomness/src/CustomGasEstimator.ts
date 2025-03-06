import {
    DefaultGasLimitEstimator,
    type EstimateGasError,
    type Transaction,
    type TransactionManager,
} from "@happy.tech/txm"
import { type Result, ok } from "neverthrow"

export class CustomGasEstimator extends DefaultGasLimitEstimator {
    override async estimateGas(
        transactionManager: TransactionManager,
        transaction: Transaction,
    ): Promise<Result<bigint, EstimateGasError>> {
        // These values are based on benchmarks from Anvil.
        // An extra margin is added to prevent errors in the randomness service due to minor contract changes.

        if (transaction.functionName === "postCommitment") {
            return ok(75000n)
        }
        if (transaction.functionName === "revealValue") {
            return ok(60000n)
        }

        if (transaction.functionName === "postDrand") {
            return ok(300000n)
        }

        return this.simulateTransactionForGas(transactionManager, transaction)
    }
}
