import { defineConfig } from "@happychain/scripts"

export default defineConfig([
    {
        tsConfig: "tsconfig.json",
        bunConfig: {
            entrypoints: ["./lib/index.ts", "./lib/mikro-orm.config.ts"],
            minify: false,
            target: "node",
            external: ["viem", "@mikro-orm/better-sqlite", "@mikro-orm/core", "@mikro-orm/migrations", "eventemitter3"],
        },
    },
])
