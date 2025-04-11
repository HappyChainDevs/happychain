import type { Kysely } from "kysely"

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable("happy_receipts")
        .addColumn("id", "integer", (col) => col.primaryKey())
        .addColumn("happyTxHash", "text", (col) => col.notNull().unique())
        .addColumn("status", "text", (col) => col.notNull())
        .addColumn("revertData", "text", (col) => col.notNull())
        .addColumn("gasUsed", "text", (col) => col.notNull())
        .addColumn("gasCost", "text", (col) => col.notNull())
        .addColumn("transactionHash", "text", (col) => col.notNull())
        .execute()
}

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable("happy_receipts").execute()
}
