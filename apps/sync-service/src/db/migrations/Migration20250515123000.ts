import type { Kysely } from "kysely"
import type { Database } from "../types"

export async function up(db: Kysely<Database>) {
    await db.schema
        .createTable("walletPermissions")
        .addColumn("user", "text")
        .addColumn("invoker", "text")
        .addColumn("parentCapability", "text")
        .addColumn("caveats", "jsonb")
        .addColumn("date", "integer")
        .addColumn("id", "text", (col) => col.notNull())
        .addColumn("updatedAt", "integer")
        .addColumn("createdAt", "integer")
        .addColumn("deleted", "boolean")
        .execute()
}

export const migration20250515123000 = { up }
