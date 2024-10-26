import { defineConfig, inlineCssPlugin } from "@happychain/build"

export default defineConfig([
    {
        name: "index",
        exports: ["."],
        bunConfig: {
            external: ["@happychain/js"],
            plugins: [inlineCssPlugin],
        },
    },
    {
        name: "preact",
        exports: [{ name: "./preact", entrypoint: "./lib/badge.tsx" }],
        apiExtractorConfig: "api-extractor-preact.json",
        bunConfig: {
            external: ["@happychain/js", "preact"],
            plugins: [inlineCssPlugin],
        },
    },
])
