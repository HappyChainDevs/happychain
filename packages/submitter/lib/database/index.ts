import { Database as BunDatabase } from "bun:sqlite"
import { Kysely } from "kysely"
import { BunSqliteDialect } from "kysely-bun-sqlite"
import env from "#lib/env"
import type { DB } from "./generated"
import { SerializePlugin, type TransformerRules } from "./plugins/SerializerPlugin"

const transformerRules: TransformerRules = {
    bigint: {
        from(value: bigint) {
            // stringify bigints with prefix
            return `#bigint.${value.toString()}`
        },
    },

    string: {
        to(value: string) {
            // if its a serialized bigint, lets deserialize
            if (!value.startsWith("#bigint.")) return value
            return BigInt(value.replace(/^#bigint\./, ""))
        },
    },
}
export const dialect = new BunSqliteDialect({ database: new BunDatabase(env.DATABASE_URL) })
const plugins = [new SerializePlugin(transformerRules)]
export const db = new Kysely<DB>({ dialect, plugins })
