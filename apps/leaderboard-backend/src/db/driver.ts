import { Database as BunDatabase } from "bun:sqlite"
import { Kysely } from "kysely"
import { BunSqliteDialect } from "kysely-bun-sqlite"
import type { Database } from "./types"

import { env } from "../env"

const dbPath = env.LEADERBOARD_DB_URL || ":memory:"

export const db = new Kysely<Database>({
    dialect: new BunSqliteDialect({ database: new BunDatabase(dbPath) }),
    // Add plugins here if needed
})
