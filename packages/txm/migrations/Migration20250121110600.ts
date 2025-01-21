import type { Kysely } from "kysely"
import type { Database } from "../lib/db/types"

export async function up(db: Kysely<Database>) {
    await db.schema.alterTable("transaction").addColumn("collectionBlock", "integer").execute()
}