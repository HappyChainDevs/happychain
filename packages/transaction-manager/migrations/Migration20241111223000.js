/*
    SQLite does not have native time types. The SQL interface allows arbitrary type names including "DATE" and "DATETIME",
    but this is invalid in this API, and results in "NUMERIC" affinity instead of "INTEGER" affinity, 
    which is the one we want here
*/
export async function up(db) {
    await db.schema.alterTable("transaction").addColumn("createdAt", "integer").execute()

    await db.schema.alterTable("transaction").addColumn("updatedAt", "integer").execute()
}
