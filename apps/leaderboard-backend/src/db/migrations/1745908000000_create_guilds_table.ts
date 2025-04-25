import type { Kysely } from "kysely"
import { sql } from "kysely"

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time.
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable("guilds")
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("name", "text", (col) => col.notNull().unique())
        .addColumn("admin_id", "integer", (col) => col.notNull())
        .addForeignKeyConstraint("guilds_admin_id_fk", ["admin_id"], "users", ["id"])
        .addColumn("created_at", "text", (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .execute()
}

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time.
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable("guilds").execute()
}
