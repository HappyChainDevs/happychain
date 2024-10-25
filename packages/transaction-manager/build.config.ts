import { defineConfig } from "@happychain/scripts"

export default defineConfig({
    tsConfig: "tsconfig.json",
    bunConfig: {
        entrypoints: ["./lib/index.ts", "./lib/mikro-orm.config.ts"],
        minify: false,
        target: "node",
        // These packages are not used by us, but mikro-orm depends on them because they can be imported dynamically.
        // Therefore, when bundling the package, we need to instruct bun to ignore them since they are not actually installed.
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
})
