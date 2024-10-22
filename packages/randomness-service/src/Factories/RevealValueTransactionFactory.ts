import type { Address } from "viem"
import { Transaction } from "@happychain/transaction-manager"


export class RevealValueTransactionFactory {
    private readonly chainId: number
    private readonly randomContractAddress: Address

    constructor(chainId: number, randomContractAddress: Address) {
        this.chainId = chainId
        this.randomContractAddress = randomContractAddress
    }

    create(timestamp: bigint, revealedValue: bigint): Transaction {
        return new Transaction({
            chainId: this.chainId,
            address: this.randomContractAddress,
            functionName: "revealValue",
            alias: "Random",
            args: [timestamp, revealedValue],
            deadline: Number(timestamp),
        })
    }
}