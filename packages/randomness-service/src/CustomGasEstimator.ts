import {
    type EstimateGasErrorCause,
    GasEstimator,
    type Transaction,
    type TransactionManager,
} from "@happychain/transaction-manager"
import { type Result, ok } from "neverthrow"

export class CustomGasEstimator extends GasEstimator {
    override async estimateGas(
        transactionManager: TransactionManager,
        transaction: Transaction,
    ): Promise<Result<bigint, EstimateGasErrorCause>> {
        if (transaction.functionName === "postCommitment") {
            return ok(50000n)
        }
        if (transaction.functionName === "revealValue") {
            return ok(100000n)
        }

        return this.estimateGasSimulating(transactionManager, transaction)
    }
}
