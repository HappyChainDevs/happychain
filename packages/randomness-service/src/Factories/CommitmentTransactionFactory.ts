import { Transaction } from "@happychain/transaction-manager"
import type { Address, Hex } from "viem"

export class CommitmentTransactionFactory {
    private readonly chainId: number
    private readonly randomContractAddress: Address
    private readonly precommitDelay: bigint

    constructor(chainId: number, randomContractAddress: Address, precommitDelay: bigint) {
        this.chainId = chainId
        this.randomContractAddress = randomContractAddress
        this.precommitDelay = precommitDelay
    }

    create(timestamp: bigint, commitment: Hex): Transaction {
        return new Transaction({
            chainId: this.chainId,
            address: this.randomContractAddress,
            functionName: "postCommitment",
            alias: "Random",
            args: [timestamp, commitment],
            deadline: Number(timestamp - this.precommitDelay),
        })
    }
}
