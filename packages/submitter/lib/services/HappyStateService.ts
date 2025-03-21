import type { HappyState } from "#lib/database/generated"
import type { HappyStateRepository } from "#lib/database/repositories/HappyStateRepository"

export class HappyStateService {
    constructor(private happyStateRepository: HappyStateRepository) {}

    async insert(newHappyState: Omit<HappyState, "id">) {
        const state = await this.happyStateRepository.insert(newHappyState)
        return state
    }
}
