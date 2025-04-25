import type { Kysely } from "kysely"
import { sql } from "kysely"

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable("users")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("happy_wallet", "text", (col) => col.notNull().unique())
        .addColumn("username", "text", (col) => col.notNull().unique())
        .addColumn("guild_id", "integer", (col) => col) // FK if you want, or nullable
        .addColumn("created_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .execute()
}

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable("users").execute()
}
