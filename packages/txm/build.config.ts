import { defineConfig } from "@happy.tech/happybuild"

export default defineConfig({
    bunConfig: {
        minify: false,
        target: "node",
        external: ["better-sqlite3"],
    },
})
