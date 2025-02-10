import type { Transaction, TransactionManager } from "@happy.tech/txm"
import { ok } from "neverthrow"
import type { Result } from "neverthrow"
import type { Address, Hex } from "viem"
import type { Randomness } from "./Randomness"
import { env } from "./env"

export class TransactionFactory {
    constructor(
        private readonly transactionManager: TransactionManager,
        private readonly randomContractAddress: Address,
        private readonly precommitDelay: bigint,
    ) {}

    createCommitmentTransaction(randomness: Randomness): Transaction {
        // The commitment transaction must be submitted at least one block
        // before the deadline, because submissions after the precommit delay
        // are not allowed. We compute the deadline by subtracting the precommit
        // delay from the block number, multiplying by the block time, and adding
        // the genesis timestamp.
        const deadline = Number(
            (randomness.blockNumber - this.precommitDelay) * env.BLOCK_TIME + env.HAPPY_GENESIS_TIMESTAMP_SECONDS,
        )
        return this.transactionManager.createTransaction({
            address: this.randomContractAddress,
            functionName: "postCommitment",
            contractName: "Random",
            args: [randomness.blockNumber, randomness.hashedValue],
            deadline,
        })
    }

    createRevealValueTransaction(randomness: Randomness): Transaction {
        // The reveal transaction must execute in its target block.
        // We calculate its deadline by multiplying the block number by the block time
        // and adding the genesis timestamp.
        const deadline = Number(randomness.blockNumber * env.BLOCK_TIME + env.HAPPY_GENESIS_TIMESTAMP_SECONDS)

        return this.transactionManager.createTransaction({
            address: this.randomContractAddress,
            functionName: "revealValue",
            contractName: "Random",
            args: [randomness.blockNumber, randomness.value],
            deadline,
        })
    }

    createPostDrandTransaction({
        round,
        signature,
    }: {
        round: bigint
        signature: Hex
    }): Result<Transaction, Error> {
        const startSecondSliceIndex = signature.length - 64

        const signatureSlice1 = "0x" + signature.slice(2, startSecondSliceIndex)
        const signatureSlice2 = "0x" + signature.slice(startSecondSliceIndex)

        const signatureArray = [BigInt(signatureSlice1), BigInt(signatureSlice2)]

        return ok(
            this.transactionManager.createTransaction({
                address: this.randomContractAddress,
                functionName: "postDrand",
                contractName: "Random",
                args: [round, signatureArray],
            }),
        )
    }
}
