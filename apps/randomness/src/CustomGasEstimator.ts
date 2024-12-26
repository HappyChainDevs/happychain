import {
    DefaultGasLimitEstimator,
    type EstimateGasErrorCause,
    type Transaction,
    type TransactionManager,
} from "@happy.tech/txm"
import { type Result, ok } from "neverthrow"

export class CustomGasEstimator extends DefaultGasLimitEstimator {
    override async estimateGas(
        transactionManager: TransactionManager,
        transaction: Transaction,
    ): Promise<Result<bigint, EstimateGasErrorCause>> {
        if (transaction.functionName === "postCommitment") {
            return ok(75000n)
        }
        if (transaction.functionName === "revealValue") {
            return ok(100000n)
        }

        return this.simulateTransactionForGas(transactionManager, transaction)
    }
}
