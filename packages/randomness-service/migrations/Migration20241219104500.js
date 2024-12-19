// The 'value' column is defined as text because the data size exceeds the capacity of an integer field
export async function up(db) {
    await db.schema
        .createTable("drands")
        .addColumn("round", "text", (col) => col.notNull())
        .addColumn("signature", "text")
        .addColumn("status", "text", (col) => col.notNull())
        .addColumn("transactionIntentId", "text")
        .execute()
}
