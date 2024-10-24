import { type Result, err, ok } from "neverthrow"
import { encodeFunctionData } from "viem"
import type { Transaction } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"

export enum EstimateGasErrorCause {
    ABINotFound = "ABINotFound",
    ClientError = "ClientError",
}

export class GasEstimator {
    public async estimateGas(
        transactionManager: TransactionManager,
        transaction: Transaction,
    ): Promise<Result<bigint, EstimateGasErrorCause>> {
        return this.simulateTransactionForGas(transactionManager, transaction)
    }

    /**
     * This protected method is created to allow classes that extend GasEstimator
     * to use the default case without needing to reimplement it. This is particularly
     * useful for services like the Randomness service.
     */
    protected async simulateTransactionForGas(
        transactionManager: TransactionManager,
        transaction: Transaction,
    ): Promise<Result<bigint, EstimateGasErrorCause>> {
        const abi = transactionManager.abiManager.get(transaction.contractName)

        if (!abi) {
            return err(EstimateGasErrorCause.ABINotFound)
        }

        const functionName = transaction.functionName
        const args = transaction.args
        const data = encodeFunctionData({ abi, functionName, args })

        const gasResult = await transactionManager.viemClient.safeEstimateGas({
            to: transaction.address,
            data,
            value: 0n,
        })

        if (gasResult.isErr()) {
            return err(EstimateGasErrorCause.ClientError)
        }

        return ok(gasResult.value)
    }
}
