import type * as Schema from "#lib/database/generated"
import type { BoopStateRepository } from "#lib/database/repositories/BoopStateRepository"
import { auto } from "#lib/database/tables"

export class BoopStateService {
    constructor(private boopStateRepository: BoopStateRepository) {}

    async insert(boopState: Omit<Schema.State, "id">) {
        return await this.boopStateRepository.insert({ ...boopState, id: auto })
    }
}
