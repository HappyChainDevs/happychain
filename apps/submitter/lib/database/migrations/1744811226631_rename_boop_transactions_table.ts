import { type Kysely, sql } from "kysely"

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable("boop_transactions")
        .addColumn("id", "integer", (col) => col.primaryKey())

        .addColumn("boopHash", "text", (col) => col.notNull().unique()) // renames happyTxHash to boopHash
        .addColumn("entryPoint", "text", (col) => col.notNull())

        .addColumn("account", "text", (col) => col.notNull())
        .addColumn("dest", "text", (col) => col.notNull())
        .addColumn("payer", "text", (col) => col.notNull()) // renames paymaster to payer

        .addColumn("value", "text", (col) => col.notNull())
        .addColumn("nonceTrack", "text", (col) => col.notNull())
        .addColumn("nonceValue", "text", (col) => col.notNull())

        .addColumn("maxFeePerGas", "text", (col) => col.notNull())
        .addColumn("submitterFee", "text", (col) => col.notNull())

        .addColumn("gasLimit", "text", (col) => col.notNull())
        .addColumn("validateGasLimit", "text", (col) => col.notNull())
        .addColumn("executeGasLimit", "text", (col) => col.notNull())
        .addColumn("validatePaymentGasLimit", "text", (col) => col.notNull())

        .addColumn("callData", "text", (col) => col.notNull())
        .addColumn("validatorData", "text", (col) => col.notNull())
        .addColumn("extraData", "text", (col) => col.notNull())
        .execute()

    await db
        .insertInto("boop_transactions")
        .columns([
            "id",
            "boopHash",
            "entryPoint",
            "account",
            "dest",
            "payer",
            "value",
            "nonceTrack",
            "nonceValue",
            "maxFeePerGas",
            "submitterFee",
            "gasLimit",
            "validateGasLimit",
            "executeGasLimit",
            "validatePaymentGasLimit",
            "callData",
            "validatorData",
            "extraData",
        ])
        .expression(
            db.selectFrom("happy_transactions").select([
                "id",
                "happyTxHash as boopHash",
                "entryPoint",
                "account",
                "dest",
                // Remap paymaster to payer, and remove paymasterData
                "paymaster as payer",
                "value",
                "nonceTrack",
                "nonceValue",
                "maxFeePerGas",
                "submitterFee",
                "gasLimit",
                "validateGasLimit",
                "executeGasLimit",
                "validatePaymentGasLimit",
                "callData",
                "validatorData",
                "extraData",
            ]),
        )
        .execute()

    // Remove the old happy_transactions table
    await db.schema.dropTable("happy_transactions").execute()
}

// biome-ignore lint/suspicious/noExplicitAny: `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable("happy_transactions")
        .addColumn("id", "integer", (col) => col.primaryKey())
        .addColumn("happyTxHash", "text", (col) => col.notNull().unique())
        .addColumn("entryPoint", "text", (col) => col.notNull())
        .addColumn("account", "text", (col) => col.notNull())
        .addColumn("dest", "text", (col) => col.notNull())
        .addColumn("paymaster", "text", (col) => col.notNull())
        .addColumn("value", "text", (col) => col.notNull())
        .addColumn("nonceTrack", "text", (col) => col.notNull())
        .addColumn("nonceValue", "text", (col) => col.notNull())
        .addColumn("maxFeePerGas", "text", (col) => col.notNull())
        .addColumn("submitterFee", "text", (col) => col.notNull())
        .addColumn("gasLimit", "text", (col) => col.notNull())
        .addColumn("validateGasLimit", "text", (col) => col.notNull())
        .addColumn("executeGasLimit", "text", (col) => col.notNull())
        .addColumn("validatePaymentGasLimit", "text", (col) => col.notNull())
        .addColumn("callData", "text", (col) => col.notNull())
        .addColumn("paymasterData", "text", (col) => col.notNull())
        .addColumn("validatorData", "text", (col) => col.notNull())
        .addColumn("extraData", "text", (col) => col.notNull())
        .execute()

    await db
        .insertInto("happy_transactions")
        .columns([
            "id",
            "happyTxHash",
            "entryPoint",
            "account",
            "dest",
            "paymaster",
            "value",
            "nonceTrack",
            "nonceValue",
            "maxFeePerGas",
            "submitterFee",
            "gasLimit",
            "validateGasLimit",
            "executeGasLimit",
            "validatePaymentGasLimit",
            "callData",
            "paymasterData",
            "validatorData",
            "extraData",
        ])
        .expression(
            db.selectFrom("happy_transactions").select([
                "id",
                "boopHash as happyTxHash",
                "entryPoint",
                "account",
                "dest",
                // Remap payer to paymaster
                "payer as paymaster",
                "value",
                "nonceTrack",
                "nonceValue",
                "maxFeePerGas",
                "submitterFee",
                "gasLimit",
                "validateGasLimit",
                "executeGasLimit",
                "validatePaymentGasLimit",
                "callData",
                sql`'0x'`.as("paymasterData"),
                "validatorData",
                "extraData",
            ]),
        )
        .execute()
    await db.schema.dropTable("boop_transactions").execute()
}
