import type { Kysely } from "kysely"

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable("happy_simulations")
        .addColumn("id", "integer", (col) => col.primaryKey())
        .addColumn("happyTxHash", "text", (col) => col.notNull().unique()) // unique and replace on updates?
        .addColumn("status", "text", (col) => col.notNull())
        .addColumn("validationStatus", "text", (col) => col.notNull())
        .addColumn("gas", "text", (col) => col.notNull())
        .addColumn("executeGas", "text", (col) => col.notNull())
        .addColumn("revertData", "text", (col) => col.notNull())
        .addColumn("failureReason", "text", (col) => col.notNull())
        .addColumn("entryPoint", "text", (col) => col.notNull())
        .execute()
}

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable("happy_simulations").execute()
}
