import type { Kysely } from "kysely"
import type { Database } from "../src/db/types"

export async function up(db: Kysely<Database>) {
    await db.schema
        .createTable("drands")
        .addColumn("round", "text", (col) => col.notNull())
        .addColumn("signature", "text")
        .addColumn("status", "text", (col) => col.notNull())
        .addColumn("transactionIntentId", "text")
        .execute()
}
