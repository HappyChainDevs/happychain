import type { Transaction, TransactionManager } from "@happychain/transaction-manager"
import type { Address } from "viem"
import type { Randomness } from "../Randomnnes"

export class RevealValueTransactionFactory {
    private readonly transactionManager: TransactionManager
    private readonly randomContractAddress: Address

    constructor(transactionManager: TransactionManager, randomContractAddress: Address) {
        this.transactionManager = transactionManager
        this.randomContractAddress = randomContractAddress
    }

    create(randomness: Randomness): Transaction {
        return this.transactionManager.createTransaction({
            address: this.randomContractAddress,
            functionName: "revealValue",
            contractName: "Random",
            args: [randomness.timestamp, randomness.value],
            deadline: Number(randomness.timestamp),
        })
    }
}
