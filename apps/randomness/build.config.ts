import { defineConfig } from "@happy.tech/happybuild"

export default defineConfig({
    bunConfig: {
        entrypoints: ["./src/index.ts", "./src/migrate.ts"],
        minify: false,
        target: "node",
        external: ["better-sqlite3"],
    },
})
