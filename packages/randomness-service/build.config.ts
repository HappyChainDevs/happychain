import { defineConfig } from "@happychain/scripts"

export default defineConfig({
    bunConfig: {
        entrypoints: ["./src/index.ts", "./src/migrate.ts"],
        minify: false,
        target: "node",
        external: ["better-sqlite3"],
    },
})
