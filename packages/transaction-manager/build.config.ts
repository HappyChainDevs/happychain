import { defineConfig } from "@happychain/scripts"

export default defineConfig({
    bunConfig: {
        entrypoints: ["./lib/index.ts", "./lib/mikro-orm.config.ts"],
        minify: false,
        target: "node",
        packages: "external",
    },
})
