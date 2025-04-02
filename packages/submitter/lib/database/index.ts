import { Database as BunDatabase } from "bun:sqlite"
import { Kysely } from "kysely"
import { BunSqliteDialect } from "kysely-bun-sqlite"
import env from "#lib/env"
import type { DB } from "./generated"
import { SerializePlugin } from "./plugins/SerializerPlugin"
import { transformerRules } from "./transformer-rules"

export const db = new Kysely<DB>({
    dialect: new BunSqliteDialect({ database: new BunDatabase(env.DATABASE_URL) }),
    plugins: [new SerializePlugin(transformerRules)],
})
