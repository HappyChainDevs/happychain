import SQLite from "better-sqlite3"
import { Kysely, SqliteDialect } from "kysely"
import { env } from "../env"
import type { Database } from "./types.js"

const dialect = new SqliteDialect({
    database: new SQLite(env.RANDOMNESS_DB_PATH ?? ":memory:"),
})

export const db = new Kysely<Database>({
    dialect,
})
