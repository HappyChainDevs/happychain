import { Database } from "bun:sqlite"
import { BunSqliteDialect } from "kysely-bun-sqlite"
import { defineConfig } from "kysely-ctl"
import { db } from "../src/database"
export default defineConfig({
    // replace me with a real dialect instance OR a dialect name + `dialectConfig` prop.
    kysely: db,
    migrations: {
        migrationFolder: "migrations",
    },
    //   plugins: [],
    //   seeds: {
    //     seedFolder: "seeds",
    //   }
})
