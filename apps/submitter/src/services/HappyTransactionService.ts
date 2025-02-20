import type { HappyTransaction } from "#src/database/generated"
import type { HappyTransactionRepository } from "#src/repositories/HappyTransactionRepository"

export class HappyTransactionService {
    constructor(private happyTransactionRepository: HappyTransactionRepository) {}

    async findByHappyTxHash(hash: `0x${string}`) {
        return await this.happyTransactionRepository.findByHappyTxHash(hash)
    }

    async insert(newData: Omit<HappyTransaction, "id">): Promise<HappyTransaction> {
        const data = await this.happyTransactionRepository.insert(newData)
        return data!
    }
}
