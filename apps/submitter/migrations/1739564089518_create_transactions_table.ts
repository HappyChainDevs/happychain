import type { Kysely } from "kysely"

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable("transactions")
        .addColumn("id", "integer", (col) => col.primaryKey())
        .addColumn("hash", "text", (col) => col.notNull().unique())
        .addColumn("blockNumber", "text", (col) => col.notNull())
        .execute()
}

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable("transactions").execute()
}
