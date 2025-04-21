import type { Kysely } from "kysely"

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable("happy_states")
        .addColumn("id", "integer", (col) => col.primaryKey())
        .addColumn("status", "text", (col) => col.notNull())
        .addColumn("included", "boolean", (col) => col.notNull())
        .addColumn("happyTransactionId", "integer", (col) => col.notNull())
        .addColumn("happyReceiptId", "integer")
        .execute()
}

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable("happy_states").execute()
}
