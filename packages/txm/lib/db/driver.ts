import { type Dialect, Kysely } from "kysely"
import type { Database } from "./types.js"

async function createDb(): Promise<Kysely<Database>> {
    const dbPath = process.env.TXM_DB_PATH ?? ":memory:"
    const isBun = typeof Bun !== "undefined" || Boolean(process.versions?.bun)
    let dialect: Dialect

    if (isBun) {
        const { Database: BunDatabase } = await import("bun:sqlite")
        const { BunSqliteDialect } = await import("kysely-bun-sqlite")
        dialect = new BunSqliteDialect({
            database: new BunDatabase(dbPath),
        })
    } else {
        const BetterSqlite3 = (await import("better-sqlite3")).default
        const { SqliteDialect } = await import("kysely")
        dialect = new SqliteDialect({
            database: new BetterSqlite3(dbPath),
        })
    }

    return new Kysely<Database>({ dialect })
}

export const db = await createDb()
