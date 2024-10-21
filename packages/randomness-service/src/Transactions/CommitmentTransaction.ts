import { Transaction } from "@happychain/transaction-manager"
import type { Address, Hex } from "viem"

export class CommitmentTransaction extends Transaction {
    constructor({
        timestamp,
        commitment,
        chainId,
        address,
        precommitDelay,
    }: {
        timestamp: bigint
        commitment: Hex
        chainId: number
        address: Address
        precommitDelay: bigint
    }) {
        super({
            chainId,
            address,
            functionName: "postCommitment",
            alias: "Random",
            args: [timestamp, commitment],
            deadline: Number(timestamp - precommitDelay),
        })
    }
}
