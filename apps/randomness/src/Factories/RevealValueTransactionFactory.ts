import type { Transaction, TransactionManager } from "@happy.tech/txm"
import type { Address } from "viem"

export class RevealValueTransactionFactory {
    private readonly transactionManager: TransactionManager
    private readonly randomContractAddress: Address

    constructor(transactionManager: TransactionManager, randomContractAddress: Address) {
        this.transactionManager = transactionManager
        this.randomContractAddress = randomContractAddress
    }

    create(timestamp: bigint, revealedValue: bigint): Transaction {
        return this.transactionManager.createTransaction({
            address: this.randomContractAddress,
            functionName: "revealValue",
            contractName: "Random",
            args: [timestamp, revealedValue],
            deadline: Number(timestamp),
        })
    }
}
