import type { Transaction, TransactionManager } from "@happy.tech/txm"
import type { Address } from "viem"
import type { Randomness } from "./Randomness"

export class TransactionFactory {
    private readonly transactionManager: TransactionManager
    private readonly randomContractAddress: Address
    private readonly precommitDelay: bigint

    constructor(transactionManager: TransactionManager, randomContractAddress: Address, precommitDelay: bigint) {
        this.transactionManager = transactionManager
        this.randomContractAddress = randomContractAddress
        this.precommitDelay = precommitDelay
    }

    createCommitmentTransaction(randomness: Randomness): Transaction {
        return this.transactionManager.createTransaction({
            address: this.randomContractAddress,
            functionName: "postCommitment",
            contractName: "Random",
            args: [randomness.timestamp, randomness.hashedValue],
            deadline: Number(randomness.timestamp - this.precommitDelay),
        })
    }

    createRevealValueTransaction(randomness: Randomness): Transaction {
        return this.transactionManager.createTransaction({
            address: this.randomContractAddress,
            functionName: "revealValue",
            contractName: "Random",
            args: [randomness.timestamp, randomness.value],
            deadline: Number(randomness.timestamp),
        })
    }
}
