export async function up(db) {
    await db.schema.alterTable("transaction").addColumn("collectionBlock", "integer").execute()
}
