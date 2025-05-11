import type { Kysely } from "kysely"

// biome-ignore lint/suspicious/noExplicitAny:
type DB = Kysely<any>

export async function up(db: DB) {
    await db.schema
        .createTable("boops")
        .addColumn("id", "integer", (col) => col.primaryKey().notNull())
        .addColumn("entryPoint", "text", (col) => col.notNull())
        .addColumn("boopHash", "text", (col) => col.notNull().unique())
        .addColumn("account", "text", (col) => col.notNull())
        .addColumn("dest", "text", (col) => col.notNull())
        .addColumn("payer", "text", (col) => col.notNull())
        .addColumn("value", "text", (col) => col.notNull())
        .addColumn("nonceTrack", "text", (col) => col.notNull())
        .addColumn("nonceValue", "text", (col) => col.notNull())
        .addColumn("maxFeePerGas", "text", (col) => col.notNull())
        .addColumn("submitterFee", "text", (col) => col.notNull())
        .addColumn("gasLimit", "integer", (col) => col.notNull())
        .addColumn("validateGasLimit", "integer", (col) => col.notNull())
        .addColumn("validatePaymentGasLimit", "integer", (col) => col.notNull())
        .addColumn("executeGasLimit", "integer", (col) => col.notNull())
        .addColumn("callData", "text", (col) => col.notNull())
        .addColumn("validatorData", "text", (col) => col.notNull())
        .addColumn("extraData", "text", (col) => col.notNull())
        .execute()

    await db.schema
        .createTable("states")
        .addColumn("id", "integer", (col) => col.primaryKey().notNull())
        .addColumn("status", "text", (col) => col.notNull())
        .addColumn("included", "boolean", (col) => col.notNull())
        .addColumn("boopId", "integer", (col) => col.notNull())
        .addColumn("receiptId", "integer")
        .execute()

    await db.schema
        .createTable("receipts")
        .addColumn("id", "integer", (col) => col.primaryKey().notNull())
        .addColumn("boopHash", "text", (col) => col.notNull().unique())
        .addColumn("status", "text", (col) => col.notNull())
        .addColumn("revertData", "text", (col) => col.notNull())
        .addColumn("gasUsed", "text", (col) => col.notNull())
        .addColumn("gasCost", "text", (col) => col.notNull())
        .addColumn("txHash", "text", (col) => col.notNull())
        .execute()
}

export async function down(db: DB) {
    await db.schema.dropTable("boops").execute()
    await db.schema.dropTable("states").execute()
    await db.schema.dropTable("receipts").execute()
}
