import { EstimateGasErrorCause, GasEstimator, type Transaction, type TransactionManager } from "@happychain/transaction-manager";

export class CustomGasEstimator extends GasEstimator {
    override async estimateGas(transactionManager: TransactionManager, transaction: Transaction: Promise<Result<bigint, EstimateGasErrorCause>> {
        

    }
}
