import type { Kysely } from "kysely"
import type { Database } from "../types"

/*
    SQLite does not have native time types. The SQL interface allows arbitrary type names including "DATE" and "DATETIME",
    but this is invalid in this API, and results in "NUMERIC" affinity instead of "INTEGER" affinity, 
    which is the one we want here
*/
async function up(db: Kysely<Database>) {
    await db.schema.alterTable("transaction").addColumn("createdAt", "integer").execute()

    await db.schema.alterTable("transaction").addColumn("updatedAt", "integer").execute()
}

export const migration20241111223000 = { up }
