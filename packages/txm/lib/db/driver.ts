import { Database as BunDatabase } from "bun:sqlite"
import { Kysely } from "kysely"
import { BunSqliteDialect } from "kysely-bun-sqlite"
import type { Database } from "./types.js"

const dialect = new BunSqliteDialect({
    database: new BunDatabase(process.env.TXM_DB_PATH ?? ":memory:"),
})

export const db = new Kysely<Database>({
    dialect,
})
