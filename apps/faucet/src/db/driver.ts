import { Database as BunDatabase } from "bun:sqlite"
import { Kysely } from "kysely"
import { BunSqliteDialect } from "kysely-bun-sqlite"
import { env } from "../env"
import type { Database } from "./types.js"

const dialect = new BunSqliteDialect({
    database: new BunDatabase(env.FAUCET_DB_PATH ?? ":memory:"),
})

export const db = new Kysely<Database>({
    dialect,
})
