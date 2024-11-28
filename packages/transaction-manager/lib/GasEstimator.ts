import { type Result, err, ok } from "neverthrow"
import { encodeFunctionData } from "viem"
import type { Transaction } from "./Transaction.js"
import type { TransactionManager } from "./TransactionManager.js"

export enum EstimateGasErrorCause {
    ABINotFound = "ABINotFound",
    ClientError = "ClientError",
}

export interface IGasEstimator {
    estimateGas(
        transactionManager: TransactionManager,
        transaction: Transaction,
    ): Promise<Result<bigint, EstimateGasErrorCause>>
}

/**
 * This is the default module used to estimate the gas for a transaction. When creating a new transaction manager,
 * you can pass a custom gas estimator. The custom GasEstimator should implement the same interface as the default GasEstimator.
 * The best approach would be to extend the default GasEstimator to use the protected method `simulateTransactionForGas`,
 * which, as its name suggests, estimates a transaction's gas by simulating it.
 * Sometimes, the standard process of simulating a transaction to estimate gas is not feasible.
 * When you simulate a transaction, you're doing so in a different block with a different
 * blockchain state than when the transaction will actually be executed.
 * This can lead to two issues: the transaction might fail in the estimation but not in reality, and the gas estimation might be inaccurate.
 * For example, in the randomness service, we need to emit the reveal transaction at precisely the right block.
 * This transaction would fail if executed before the correct block, so when you try to simulate it, you'll receive a failure.
 * By avoiding transaction simulation, you can also improve the performance of the transaction manager.
 * You eliminate an RPC call, increasing the likelihood that your transaction will be included in the next block.
 * Furthermore, if you're always executing the same type of transaction, it typically consumes a similar amount of gas.
 * In this case, even if transaction simulation is an option, it's good practice to skip it.
 * Instead, you can hardcode an upper bound of the gas amount, rather than calculating it each time.
 * Because the extra gas gets refunded, this is both safe and doesn't incur extra cost,
 * though it increases your gas capital requirement if you have a lot of transaction in flight.
 */
export class GasEstimator implements IGasEstimator {
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
            account: transactionManager.viemWallet.account,
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
