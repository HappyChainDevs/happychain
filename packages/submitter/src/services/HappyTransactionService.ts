import type { HappyTransaction } from "#src/database/generated"
import type { HappyTransactionRepository } from "#src/database/repositories/HappyTransactionRepository"

export class HappyTransactionService {
    constructor(private happyTransactionRepository: HappyTransactionRepository) {}

    async findByHappyTxHash(happyTxHash: `0x${string}`) {
        return await this.happyTransactionRepository.findByHappyTxHash(happyTxHash)
    }

    async findByHappyTxHashOrThrow(happyTxHash: `0x${string}`) {
        const happyTransaction = await this.findByHappyTxHash(happyTxHash)
        if (!happyTransaction) {
            throw new Error(`Happy transaction not found for hash: ${happyTxHash}`)
        }
        return happyTransaction
    }

    async insert(newData: Omit<HappyTransaction, "id">): Promise<HappyTransaction | undefined> {
        const data = await this.happyTransactionRepository.insert(newData)
        return data
    }
}
