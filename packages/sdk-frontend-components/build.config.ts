import { defineConfig, inlineCssPlugin } from "@happychain/scripts"

export default defineConfig([
    {
        name: "index",
        exports: ["."],
        bunConfig: {
            entrypoints: ["./lib/index.ts"],
            external: ["@happychain/js"],
            plugins: [inlineCssPlugin],
        },
    },
    {
        name: "preact",
        exports: ["./preact"],
        apiExtractorConfig: "api-extractor-preact.json",
        bunConfig: {
            entrypoints: ["./lib/badge.tsx"],
            external: ["@happychain/js", "preact"],
            plugins: [inlineCssPlugin],
        },
    },
])
