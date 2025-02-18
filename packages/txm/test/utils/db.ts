import { db } from "../../lib/db/driver"

export async function cleanDB() {
    await db.schema.dropTable("transaction").execute()
    await db.schema.dropTable("kysely_migration").execute()
    await db.schema.dropTable("kysely_migration_lock").execute()
}
