import { defineConfig } from "@happychain/scripts"

export default defineConfig([
    {
        tsConfig: "tsconfig.json",
        apiExtractorConfig: false,
        bunConfig: {
            entrypoints: ["./lib/index.ts"],
            sourcemap: "linked",
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
            sourcemap: "linked",
            target: "node",
            naming: "[dir]/mikro-orm.config.js",
            external: ["@mikro-orm/better-sqlite"],
        },
    },
    {
        tsConfig: "tsconfig.json",
        apiExtractorConfig: false,
        bunConfig: {
            entrypoints: ["./lib/Transaction.ts"],
            sourcemap: "linked",
            target: "node",
            minify: false,
            naming: "[dir]/Transaction.js",
            external: ["viem", "@mikro-orm/better-sqlite", "@mikro-orm/core", "@mikro-orm/migrations"],
        },
    },
])
