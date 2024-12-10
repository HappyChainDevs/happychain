// The 'value' column is defined as text because the data size exceeds the capacity of an integer field
export async function up(db) {
    await db.schema
        .createTable("randomnesses")
        .addColumn("timestamp", "integer", (col) => col.notNull())
        .addColumn("value", "text", (col) => col.notNull())
        .addColumn("hashedValue", "text", (col) => col.notNull())
        .addColumn("commitmentTransactionIntentId", "text")
        .addColumn("revealTransactionIntentId", "text")
        .addColumn("status", "text", (col) => col.notNull())
        .execute()
}
