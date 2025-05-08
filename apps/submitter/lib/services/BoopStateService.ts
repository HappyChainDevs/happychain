import type { BoopState } from "#lib/database/generated"
import type { BoopStateRepository } from "#lib/database/repositories/BoopStateRepository"

export class BoopStateService {
    constructor(private boopStateRepository: BoopStateRepository) {}

    async insert(boopState: Omit<BoopState, "id">) {
        const state = await this.boopStateRepository.insert(boopState)
        return state
    }
}
