import { defineConfig } from "@happy.tech/happybuild"

export default defineConfig({
    exports: [".", "./migrate"],
    bunConfig: {
        minify: false,
        target: "node",
        external: ["better-sqlite3"],
    },
})
