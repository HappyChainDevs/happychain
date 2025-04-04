import type { Kysely } from "kysely"
import type { Database } from "../types"

export async function up(db: Kysely<Database>) {
    await db.schema
        .createTable("monitoring")
        .addColumn("blockNumber", "integer", (col) => col.notNull())
        .addColumn("blockTimestamp", "integer", (col) => col.notNull())
        .addColumn("result", "text", (col) => col.notNull())
        .addColumn("errorDescription", "text")
        .addColumn("value", "text")
        .execute()
}

export const migration20250403123000 = { up }
