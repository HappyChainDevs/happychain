import { defineConfig } from "@happychain/scripts"

export default defineConfig([
    {
        tsConfig: "tsconfig.json",
        apiExtractorConfig: false,
        bunConfig: {
            entrypoints: ["./lib/index.ts"],
            minify: false,
            target: "node",
            external: ["viem", "@mikro-orm/better-sqlite", "@mikro-orm/core", "@mikro-orm/migrations", "eventemitter3"],
        },
    },
    {
        tsConfig: "tsconfig.json",
        apiExtractorConfig: false,
        bunConfig: {
            entrypoints: ["./lib/mikro-orm.config.ts"],
            minify: false,
            target: "node",
            external: ["@mikro-orm/better-sqlite"],
        },
    },
])
