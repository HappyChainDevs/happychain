import type { Kysely } from "kysely"
import type { Database } from "../lib/db/types"

export async function up(db: Kysely<Database>) {
    await db.schema
        .createTable("transaction")
        .addColumn("intentId", "text", (col) => col.notNull())
        .addColumn("chainId", "integer", (col) => col.notNull())
        .addColumn("address", "text", (col) => col.notNull())
        .addColumn("functionName", "text", (col) => col.notNull())
        .addColumn("args", "json", (col) => col.notNull())
        .addColumn("contractName", "text", (col) => col.notNull())
        .addColumn("deadline", "integer")
        .addColumn("status", "text", (col) => col.notNull())
        .addColumn("attempts", "json", (col) => col.notNull())
        .addColumn("metadata", "json")
        .execute()
}
