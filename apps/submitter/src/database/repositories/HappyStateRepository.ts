import type { Kysely } from "kysely"
import type { DB, HappyState } from "#src/database/generated"

export class HappyStateRepository {
    constructor(private db: Kysely<DB>) {}

    async insert(state: Omit<HappyState, "id">) {
        return await this.db //
            .insertInto("happy_states")
            .values(state)
            .returningAll()
            .executeTakeFirst()
    }
}
