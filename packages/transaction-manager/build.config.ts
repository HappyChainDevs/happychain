import { defineConfig } from "@happychain/scripts"

export default defineConfig([
    {
        tsConfig: "tsconfig.json",
        bunConfig: {
            entrypoints: ["./lib/index.ts", "./lib/mikro-orm.config.ts", "./build.config.ts"],
            minify: false,
            target: "node",
            external: [
                "sqlite3",
                "mysql2",
                "mysql",
                "tedious",
                "pg",
                "pg-query-stream",
                "mariadb/callback",
                "libsql",
                "oracledb",
            ],
        },
    },
])
