import { defineConfig } from "@mikro-orm/better-sqlite"

const config = defineConfig({
    entities: ["./dist/Transaction.js"],
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
