import type { BoopTransaction } from "#lib/database/generated"
import type { BoopTransactionRepository } from "#lib/database/repositories/BoopTransactionRepository"

export class BoopTransactionService {
    constructor(private boopTransactionRepository: BoopTransactionRepository) {}

    async findByBoopHash(boopHash: `0x${string}`) {
        return await this.boopTransactionRepository.findByBoopHash(boopHash)
    }

    async findByBoopHashOrThrow(boopHash: `0x${string}`) {
        const boop = await this.findByBoopHash(boopHash)
        if (!boop) {
            throw new Error(`Happy transaction not found for hash: ${boopHash}`)
        }
        return boop
    }

    async insert(newData: Omit<BoopTransaction, "id">): Promise<BoopTransaction | undefined> {
        return await this.boopTransactionRepository.insert(newData)
    }
}
