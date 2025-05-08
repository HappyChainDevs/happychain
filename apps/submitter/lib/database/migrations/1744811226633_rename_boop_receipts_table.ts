import type { Kysely } from "kysely"

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable("boop_receipts")
        .addColumn("id", "integer", (col) => col.primaryKey())
        .addColumn("boopHash", "text", (col) => col.notNull().unique())
        .addColumn("status", "text", (col) => col.notNull())
        .addColumn("revertData", "text", (col) => col.notNull())
        .addColumn("gasUsed", "text", (col) => col.notNull())
        .addColumn("gasCost", "text", (col) => col.notNull())
        .addColumn("transactionHash", "text", (col) => col.notNull())
        .execute()

    await db
        .insertInto("boop_receipts")
        .columns(["id", "boopHash", "status", "revertData", "gasUsed", "gasCost", "transactionHash"])
        .expression(
            db
                .selectFrom("happy_receipts")
                .select([
                    "id",
                    "happyTxHash as boopHash",
                    "status",
                    "revertData",
                    "gasUsed",
                    "gasCost",
                    "transactionHash",
                ]),
        )
        .execute()

    // Remove the old happy_transactions table
    await db.schema.dropTable("happy_receipts").execute()
}

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
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

    await db
        .insertInto("happy_receipts")
        .columns(["id", "happyTxHash", "status", "revertData", "gasUsed", "gasCost", "transactionHash"])
        .expression(
            db
                .selectFrom("boop_receipts")
                .select([
                    "id",
                    "boopHash as happyTxHash",
                    "status",
                    "revertData",
                    "gasUsed",
                    "gasCost",
                    "transactionHash",
                ]),
        )
        .execute()

    // Remove the old happy_transactions table
    await db.schema.dropTable("boop_receipts").execute()
}
