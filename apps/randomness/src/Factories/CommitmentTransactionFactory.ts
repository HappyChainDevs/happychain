import type { Transaction, TransactionManager } from "@happy.tech/txm"
import type { Address, Hex } from "viem"

export class CommitmentTransactionFactory {
    private readonly transactionManager: TransactionManager
    private readonly randomContractAddress: Address
    private readonly precommitDelay: bigint

    constructor(transactionManager: TransactionManager, randomContractAddress: Address, precommitDelay: bigint) {
        this.transactionManager = transactionManager
        this.randomContractAddress = randomContractAddress
        this.precommitDelay = precommitDelay
    }

    create(timestamp: bigint, commitment: Hex): Transaction {
        return this.transactionManager.createTransaction({
            address: this.randomContractAddress,
            functionName: "postCommitment",
            contractName: "Random",
            args: [timestamp, commitment],
            deadline: Number(timestamp - this.precommitDelay),
        })
    }
}
