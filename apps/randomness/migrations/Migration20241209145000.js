// The 'value' column is defined as text because the data size exceeds the capacity of an integer field
export async function up(db) {
    await db.schema
        .createTable("commitments")
        .addColumn("timestamp", "integer", (col) => col.notNull())
        .addColumn("value", "text", (col) => col.notNull())
        .addColumn("commitment", "text", (col) => col.notNull())
        .addColumn("transactionIntentId", "text", (col) => col.notNull())
        .execute()
}
