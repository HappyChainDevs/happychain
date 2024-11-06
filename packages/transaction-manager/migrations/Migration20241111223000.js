export async function up(db) {
    await db.schema
        .alterTable("transaction")
        .addColumn("createdAt", "integer")
        .execute()

    await db.schema
        .alterTable("transaction")
        .addColumn("updatedAt", "integer")
        .execute()
}
