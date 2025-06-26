import type { Kysely } from "kysely"
import type { Database } from "../types"

export async function up(db: Kysely<Database>) {
    await db.schema
        .createTable("walletPermissions")
        .addColumn("user", "text", (col) => col.notNull())
        .addColumn("invoker", "text", (col) => col.notNull())
        .addColumn("parentCapability", "text", (col) => col.notNull())
        .addColumn("caveats", "jsonb", (col) => col.notNull())
        .addColumn("date", "integer", (col) => col.notNull())
        .addColumn("id", "text", (col) => col.notNull().primaryKey())
        .addColumn("updatedAt", "integer", (col) => col.notNull())
        .addColumn("createdAt", "integer", (col) => col.notNull())
        .addColumn("deleted", "boolean", (col) => col.notNull())
        .execute()
}

export const migration20250515123000 = { up }
