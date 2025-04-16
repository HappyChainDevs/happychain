import type { Insertable, Kysely } from "kysely"
import type { BoopState, DB } from "#lib/database/generated"

export class BoopStateRepository {
    constructor(private db: Kysely<DB>) {}

    async insert(state: Insertable<BoopState>): Promise<BoopState | undefined> {
        const { boopReceiptId, boopTransactionId, included, status } = state
        return await this.db //
            .insertInto("boop_states")
            .values({ boopReceiptId, boopTransactionId, included, status })
            .returningAll()
            .executeTakeFirst()
    }
}
