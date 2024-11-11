export async function up(db) {
    await db.schema
        .createTable("transaction")
        .addColumn("intent_id", "text", (col) => col.notNull())
        .addColumn("chain_id", "integer", (col) => col.notNull())
        .addColumn("address", "text", (col) => col.notNull())
        .addColumn("function_name", "text", (col) => col.notNull())
        .addColumn("args", "json", (col) => col.notNull())
        .addColumn("contract_name", "text", (col) => col.notNull())
        .addColumn("deadline", "integer")
        .addColumn("status", "text", (col) => col.notNull())
        .addColumn("attempts", "json", (col) => col.notNull())
        .addColumn("metadata", "json")
        .execute()
}
