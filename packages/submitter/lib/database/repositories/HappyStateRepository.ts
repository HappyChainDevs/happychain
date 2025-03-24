import type { Kysely } from "kysely"
import type { DB, HappyState } from "#lib/database/generated"

export class HappyStateRepository {
    constructor(private db: Kysely<DB>) {}

    async insert(state: Omit<HappyState, "id">) {
        return await this.db //
            .insertInto("happy_states")
            .values(state)
            .returningAll()
            .executeTakeFirst()
    }

    async update(id: number, updates: Partial<Omit<HappyState, "id">>) {
        return await this.db
            .updateTable("happy_states")
            .set(updates)
            .where("id", "=", id)
            .returningAll()
            .executeTakeFirst()
    }
}
