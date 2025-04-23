import { defineConfig } from "@happy.tech/happybuild"

export default defineConfig({
    exports: ["."],
    bunConfig: {
        minify: false,
        target: "node",
        external: ["better-sqlite3"],
    },
})
