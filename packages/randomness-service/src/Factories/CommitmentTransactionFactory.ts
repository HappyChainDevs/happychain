import type { Transaction, TransactionManager } from "@happychain/transaction-manager"
import type { Address } from "viem"
import type { Randomness } from "../Randomnnes"

export class CommitmentTransactionFactory {
    private readonly transactionManager: TransactionManager
    private readonly randomContractAddress: Address
    private readonly precommitDelay: bigint

    constructor(transactionManager: TransactionManager, randomContractAddress: Address, precommitDelay: bigint) {
        this.transactionManager = transactionManager
        this.randomContractAddress = randomContractAddress
        this.precommitDelay = precommitDelay
    }

    create(randomness: Randomness): Transaction {
        return this.transactionManager.createTransaction({
            address: this.randomContractAddress,
            functionName: "postCommitment",
            contractName: "Random",
            args: [randomness.timestamp, randomness.hashedValue],
            deadline: Number(randomness.timestamp - this.precommitDelay),
        })
    }
}
