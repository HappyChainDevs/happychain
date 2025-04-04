import type { Insertable, Kysely } from "kysely"
import type { DB, HappyState } from "#lib/database/generated"

export class HappyStateRepository {
    constructor(private db: Kysely<DB>) {}

    async insert(state: Insertable<HappyState>): Promise<HappyState | undefined> {
        const { happyReceiptId, happyTransactionId, included, status } = state
        return await this.db //
            .insertInto("happy_states")
            .values({ happyReceiptId, happyTransactionId, included, status })
            .returningAll()
            .executeTakeFirst()
    }
}
