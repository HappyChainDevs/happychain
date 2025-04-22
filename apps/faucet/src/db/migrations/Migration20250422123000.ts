import type { Kysely } from "kysely"
import type { Database } from "../types"

export async function up(db: Kysely<Database>) {
    await db.schema
        .createTable("faucetUsage")
        .addColumn("address", "text", (col) => col.notNull())
        .addColumn("occurredAt", "integer", (col) => col.notNull())
        .execute()
}

export const migration20250422123000 = { up }
