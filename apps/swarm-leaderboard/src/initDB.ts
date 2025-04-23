import { db } from "./db/driver"

import { sql } from "kysely"

export async function initDb() {
    // If using in-memory DB, always initialize
    const dbPath = process.env.SWARM_LEADERBOARD_DB_URL || ":memory:"
    if (dbPath === ":memory:") {
        await createPersonTable()
        return
    }
    // For file-based DB, only initialize if file does not exist
    const file = Bun.file(dbPath)
    if (!(await file.exists())) {
        await createPersonTable()
    }
}

async function createPersonTable() {
    await db.schema
        .createTable("person")
        .ifNotExists()
        .addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
        .addColumn("first_name", "text", (col) => col.notNull())
        .addColumn("gender", "text", (col) => col.notNull().check(sql`gender IN ('man','woman','other')`))
        .addColumn("last_name", "text")
        .addColumn("created_at", "text", (col) => col.notNull())
        .addColumn("metadata", "text", (col) => col.notNull())
        .execute()
}
