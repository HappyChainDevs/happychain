import type { Kysely } from "kysely"
import type { Database } from "../types"

export async function up(db: Kysely<Database>) {
    await db.schema.alterTable("transaction").addColumn("collectionBlock", "integer").execute()
}

export const migration20250121110600 = { up }
