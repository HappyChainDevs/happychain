import type { Kysely } from "kysely"
import type { Database } from "../types"

async function up(db: Kysely<Database>) {
    await db.schema
        .alterTable("transaction")
        .addColumn("from", "text", (col) => col.notNull())
        .execute()
}

export const migration20241205104400 = { up }