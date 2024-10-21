import type { Address, Hex } from "viem"
import { CommitmentTransaction } from "../Transactions/CommitmentTransaction"

export class CommitmentTransactionFactory {
    private readonly chainId: number
    private readonly randomContractAddress: Address
    private readonly precommitDelay: bigint

    constructor(chainId: number, randomContractAddress: Address, precommitDelay: bigint) {
        this.chainId = chainId
        this.randomContractAddress = randomContractAddress
        this.precommitDelay = precommitDelay
    }

    create(timestamp: bigint, commitment: Hex): CommitmentTransaction {
        return new CommitmentTransaction({
            timestamp,
            commitment,
            chainId: this.chainId,
            address: this.randomContractAddress,
            precommitDelay: this.precommitDelay,
        })
    }
}
