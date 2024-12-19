import type { Hex } from "@happychain/common"
import type { Transaction, TransactionManager } from "@happychain/transaction-manager"
import { type Result, err, ok } from "neverthrow"
import type { Address } from "viem"

export class PostDrandTransactionFactory {
    private readonly transactionManager: TransactionManager
    private readonly randomContractAddress: Address

    constructor(transactionManager: TransactionManager, randomContractAddress: Address) {
        this.transactionManager = transactionManager
        this.randomContractAddress = randomContractAddress
    }

    public create({
        round,
        signature,
    }: {
        round: bigint
        signature: Hex
    }): Result<Transaction, Error> {
        if (!signature) {
            return err(new Error("Signature is required to create a postDrand transaction"))
        }

        const firstSliceEndIndex = signature.length - 64 - 1

        const signatureSlice1 = "0x" + signature.slice(2, firstSliceEndIndex)
        const signatureSlice2 = "0x" + signature.slice(firstSliceEndIndex + 1)

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
