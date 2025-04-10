import type { Kysely } from "kysely"
import type { Database } from "../types"

export async function up(db: Kysely<Database>) {
    await db.schema
        .alterTable("transaction")
        .addColumn("calldata", "text")
        .execute()
}

export const migration20250410123000 = { up }
