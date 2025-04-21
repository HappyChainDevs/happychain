import type { Kysely } from "kysely"
import type { Database } from "../types"

export async function up(db: Kysely<Database>) {
    await db.schema.alterTable("transaction").addColumn("value", "text").execute()
}

export const migration20250421120000 = { up }
