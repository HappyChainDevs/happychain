import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "@mikro-orm/better-sqlite"
import { main } from "../package.json"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const mainPath = join(__dirname, "..", main)

const config = defineConfig({
    entities: [mainPath],
    dbName: process.env.TXM_DB_PATH || "txm.sqlite",
    debug: true,
    migrations: {
        path: "migrations",
        glob: "!(*.d).{js,ts,cjs}",
        // Mikro-ORM generates migration files in CJS format
        emit: "cjs",
    },
})

export default config
