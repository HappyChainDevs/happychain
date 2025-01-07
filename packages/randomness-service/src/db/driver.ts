import SQLite from "better-sqlite3"
import { Kysely, SqliteDialect } from "kysely"
import { env } from "../env"
import type { Database } from "./types.js"

const sqlite3 = new SQLite(env.RANDOMNESS_DB_PATH ?? ":memory:")

sqlite3.defaultSafeIntegers()

const dialect = new SqliteDialect({
    database: sqlite3,
})

export const db = new Kysely<Database>({
    dialect,
})
