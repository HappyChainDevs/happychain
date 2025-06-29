import type { Kysely } from "kysely"

// biome-ignore lint/suspicious/noExplicitAny:
type DB = Kysely<any>

export async function up(db: DB) {
    await db.schema
        .createTable("boops")
        .addColumn("entryPoint", "text", (col) => col.notNull())
        .addColumn("boopHash", "text", (col) => col.primaryKey().notNull())
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
        .createTable("receipts")
        .addColumn("boopHash", "text", (col) => col.primaryKey().notNull().references("boops.boopHash"))
        .addColumn("status", "text", (col) => col.notNull())
        .addColumn("description", "text", (col) => col.notNull())
        .addColumn("logs", "text", (col) => col.notNull())
        .addColumn("revertData", "text", (col) => col.notNull())
        .addColumn("evmTxHash", "text", (col) => col.notNull())
        .addColumn("blockHash", "text", (col) => col.notNull())
        .addColumn("blockNumber", "text", (col) => col.notNull())
        .addColumn("gasPrice", "text", (col) => col.notNull())
        .execute()
}

export async function down(db: DB) {
    await db.schema.dropTable("boops").execute()
    await db.schema.dropTable("receipts").execute()
}
