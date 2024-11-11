import { defineConfig } from "@happychain/scripts"

export default defineConfig({
    bunConfig: {
        entrypoints: ["./lib/index.ts", "./lib/migrate.ts"],
        minify: false,
        target: "node",
        external: ["better-sqlite3"],
    },
})
