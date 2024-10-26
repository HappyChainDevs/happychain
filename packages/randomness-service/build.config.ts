import { defineConfig } from "@happychain/build"

export default defineConfig({
    bunConfig: {
        minify: false,
        target: "node",
        external: ["better-sqlite3"],
    },
})
