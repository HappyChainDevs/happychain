import { Database } from "bun:sqlite"
import { Kysely } from "kysely"
import { BunSqliteDialect } from "kysely-bun-sqlite"
import type { DB } from "./types"

export const db = new Kysely<DB>({
    dialect: new BunSqliteDialect({
        database: new Database("db.sqlite"),
    }),
})
