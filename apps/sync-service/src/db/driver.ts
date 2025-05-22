import { Database as BunDatabase } from "bun:sqlite"
import { Kysely, ParseJSONResultsPlugin } from "kysely"
import { BunSqliteDialect } from "kysely-bun-sqlite"
import type { Database } from "./types"

import { env } from "../env"

const dbPath = env.SETTINGS_DB_URL || ":memory:"

export const db = new Kysely<Database>({
    dialect: new BunSqliteDialect({ database: new BunDatabase(dbPath) }),
    plugins: [new ParseJSONResultsPlugin()],
})
