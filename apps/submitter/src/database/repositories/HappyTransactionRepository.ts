import type { Kysely } from "kysely"
import type { DB, HappyTransaction } from "#src/database/generated"

export class HappyTransactionRepository {
    constructor(private db: Kysely<DB>) {}

    async findByHappyTxHash(hash: `0x${string}`) {
        return await this.db
            .selectFrom("happy_transactions")
            .selectAll()
            .where("happyTxHash", "=", hash)
            .executeTakeFirstOrThrow()
    }

    async insert(state: Omit<HappyTransaction, "id">) {
        const data = await this.db //
            .insertInto("happy_transactions")
            .values(state)
            // If the tx failed, and is retried with the exact same data,
            // this will be a conflict on txHash, we ignore instead of storing again
            .onConflict((oc) => oc.column("happyTxHash").doNothing())
            .returningAll()
            .executeTakeFirst()
        return data
    }

    async update(id: HappyTransaction["id"], updates: Partial<Omit<HappyTransaction, "id">>) {
        return await this.db
            .updateTable("happy_transactions")
            .set(updates)
            .where("id", "=", id)
            .returningAll()
            .executeTakeFirst()
    }
}
