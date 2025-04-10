import type { Kysely } from "kysely"
import type { Database } from "../types"

async function up(db: Kysely<Database>) {
    await db.schema
        .createTable("transaction")
        .addColumn("intentId", "text", (col) => col.notNull())
        .addColumn("chainId", "integer")
        .addColumn("address", "text")
        .addColumn("functionName", "text")
        .addColumn("args", "json")
        .addColumn("contractName", "text")
        .addColumn("deadline", "integer")
        .addColumn("status", "text")
        .addColumn("attempts", "json")
        .addColumn("metadata", "json")
        .execute()
}

export const migration20241111163800 = { up }
