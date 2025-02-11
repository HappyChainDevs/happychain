import type { Kysely } from "kysely"
import type { Database } from "../types"

export async function up(db: Kysely<Database>) {
    await db.schema
        .createTable("randomnesses")
        .addColumn("blockNumber", "text", (col) => col.notNull())
        .addColumn("value", "text", (col) => col.notNull())
        .addColumn("hashedValue", "text", (col) => col.notNull())
        .addColumn("commitmentTransactionIntentId", "text")
        .addColumn("revealTransactionIntentId", "text")
        .addColumn("status", "text", (col) => col.notNull())
        .execute()
}

export const migration20241210123000 = { up }
