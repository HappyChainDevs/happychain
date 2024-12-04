export async function up(db) {
    await db.schema.alterTable("transaction").addColumn("from", "text", (col) => col.notNull()).execute()
}
