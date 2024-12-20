import type { Transaction, TransactionManager } from "@happychain/transaction-manager"
import type { Address } from "viem"
import type { Randomness } from "../Randomness"
import { env } from "../env"

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
            args: [randomness.blockNumber, randomness.value],
            deadline:
                Number(randomness.blockNumber) * Number(env.TIME_BLOCK) + Number(env.HAPPY_GENESIS_TIMESTAMP_SECONDS),
        })
    }
}
