import type { Kysely } from "kysely"

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable("boop_states")
        .addColumn("id", "integer", (col) => col.primaryKey())
        .addColumn("status", "text", (col) => col.notNull())
        .addColumn("included", "boolean", (col) => col.notNull())
        .addColumn("boopTransactionId", "integer", (col) => col.notNull())
        .addColumn("boopReceiptId", "integer")
        .execute()

    await db
        .insertInto("boop_states")
        .columns(["id", "status", "included", "boopTransactionId", "boopReceiptId"])
        .expression(
            db
                .selectFrom("happy_states")
                .select([
                    "id",
                    "status",
                    "included",
                    "happyTransactionId as boopTransactionId",
                    "happyReceiptId as boopReceiptId",
                ]),
        )
        .execute()

    // Remove the old happy_transactions table
    await db.schema.dropTable("happy_states").execute()
}

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable("happy_states")
        .addColumn("id", "integer", (col) => col.primaryKey())
        .addColumn("status", "text", (col) => col.notNull())
        .addColumn("included", "boolean", (col) => col.notNull())
        .addColumn("happyTransactionId", "integer", (col) => col.notNull())
        .addColumn("happyReceiptId", "integer")
        .execute()

    await db
        .insertInto("happy_states")
        .columns(["id", "status", "included", "happyTransactionId", "happyReceiptId"])
        .expression(
            db
                .selectFrom("boop_states")
                .select([
                    "id",
                    "status",
                    "included",
                    "boopTransactionId as happyTransactionId",
                    "boopReceiptId as happyReceiptId",
                ]),
        )
        .execute()

    await db.schema.dropTable("boop_states").execute()
}
