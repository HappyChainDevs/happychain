import type { Kysely } from "kysely"

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable("happy_transactions")
        .addColumn("id", "integer", (col) => col.primaryKey())
        //
        .addColumn("transactionId", "integer", (col) => col.references("transactions.id").defaultTo(null))
        .addColumn("entryPoint", "text", (col) => col.notNull())
        //
        .addColumn("account", "text", (col) => col.notNull())
        .addColumn("gasLimit", "text", (col) => col.notNull())
        .addColumn("executeGasLimit", "text", (col) => col.notNull())
        .addColumn("dest", "text", (col) => col.notNull())
        .addColumn("value", "text", (col) => col.notNull())
        .addColumn("callData", "text", (col) => col.notNull())
        .addColumn("nonceTrack", "text", (col) => col.notNull())
        .addColumn("nonceValue", "text", (col) => col.notNull())
        .addColumn("maxFeePerGas", "text", (col) => col.notNull())
        .addColumn("submitterFee", "text", (col) => col.notNull())
        .addColumn("paymaster", "text", (col) => col.notNull())
        .addColumn("paymasterData", "text", (col) => col.notNull())
        .addColumn("validatorData", "text", (col) => col.notNull())
        .addColumn("extraData", "text", (col) => col.notNull())
        .execute()
}

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable("happy_transactions").execute()
}
