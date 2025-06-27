import type { Kysely } from "kysely"
import type { Database } from "../types"

export async function up(db: Kysely<Database>) {
    await db.schema
        .createTable("chains")
        .addColumn("user", "text", (col) => col.notNull())
        .addColumn("chainId", "text", (col) => col.notNull())
        .addColumn("chainName", "text", (col) => col.notNull())
        .addColumn("rpcUrls", "text", (col) => col.notNull())
        .addColumn("nativeCurrency", "json")
        .addColumn("blockExplorerUrls", "json")
        .addColumn("iconUrls", "json") 
        .addColumn("opStack", "boolean")
        .addColumn("id", "text", (col) => col.notNull().primaryKey())
        .addColumn("updatedAt", "integer", (col) => col.notNull())
        .addColumn("createdAt", "integer", (col) => col.notNull())
        .addColumn("deleted", "boolean", (col) => col.notNull())
        .execute()
}

export const migration20250626143000 = { up }
