import type { Insertable, Kysely } from "kysely"
import type * as Schema from "#lib/database/generated"
import { Tables, auto } from "#lib/database/tables"

export class BoopStateRepository {
    constructor(private db: Kysely<Schema.DB>) {}

    async insert(state: Insertable<Schema.State>): Promise<Schema.State | undefined> {
        const { receiptId, boopId, included, status } = state
        return await this.db //
            .insertInto(Tables.States)
            // TODO this works??
            .values({ id: auto, receiptId, boopId, included, status })
            .returningAll()
            .executeTakeFirst()
    }
}
