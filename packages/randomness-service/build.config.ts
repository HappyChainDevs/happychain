import { defineConfig } from "@happychain/scripts"

export default defineConfig([
    {
        tsConfig: "tsconfig.json",
        bunConfig: {
            entrypoints: ["./src/index.ts"],
            minify: false,
            target: "node",
            external: ["@happychain/transaction-manager"],
        },
    },
])
