import type { HappyTransaction } from "#lib/database/generated"
import type { HappyTransactionRepository } from "#lib/database/repositories/HappyTransactionRepository"
import { SubmitterError } from "#lib/errors/contract-errors"

export class HappyTransactionService {
    constructor(private happyTransactionRepository: HappyTransactionRepository) {}

    async findByHappyTxHash(happyTxHash: `0x${string}`) {
        return await this.happyTransactionRepository.findByHappyTxHash(happyTxHash)
    }

    async findByHappyTxHashOrThrow(happyTxHash: `0x${string}`) {
        const happyTransaction = await this.findByHappyTxHash(happyTxHash)
        if (!happyTransaction) {
            throw new SubmitterError(`Happy transaction not found for hash: ${happyTxHash}`)
        }
        return happyTransaction
    }

    async insert(newData: Omit<HappyTransaction, "id">): Promise<HappyTransaction | undefined> {
        const data = await this.happyTransactionRepository.insert(newData)
        return data
    }
}
